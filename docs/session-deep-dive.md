# The Session Subsystem — Deep Dive Tutorial

> A line-by-line, trick-by-trick walkthrough of the most complex screen in the app.

This document teaches you the session feature the way I'd teach a junior pair-programmer if we sat side-by-side. Read it in order. Don't skip the **Why this exists** boxes — they're the part that makes you sound senior in code review.

---

## Cast of characters

The session feature is six files working together. Open them all in tabs:

| File | Role | Mental model |
|---|---|---|
| `app/session.tsx` | The **screen**. The shell that the user sees. | A glass pane that displays state. |
| `hooks/useLocationTracker.ts` | The **brain**. Owns all session state and logic. | A tiny state machine + bridge to the OS. |
| `lib/locationTask.ts` | The **wire** to the OS. | Pub/sub between native location updates and the React tree. |
| `lib/geo.ts` | The **filter + math**. | Pure functions, no React. |
| `components/session/SessionMap.tsx` | The **map view**. Renders the polyline. | Dumb component — gets points, draws line. |
| `components/session/StatsSheet.tsx` | The **stats sheet**. Bottom drawer. | Dumb component — gets numbers, shows them. |

The pattern: **the brain (`useLocationTracker`) holds all the state, the screen wires it together, the components are dumb.** This is the most common architecture in serious React Native code. Learn to recognize it.

---

## Part 1 — `app/session.tsx`, line by line

### 1.1 The imports tell a story

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
```

- `useCallback`, `useEffect`, `useState` — three React hooks. We'll see each in action.
- `Alert` — a native modal popup. Not a web `alert()`. RN renders the OS's native alert dialog.
- `Pressable` — modern replacement for `TouchableOpacity`. Better feedback API. Always prefer it.
- `Text`, `View` — RN's `<div>` and `<span>` analogues. **You cannot put text outside a `<Text>`.** Forgetting this is rite of passage.
- `router` — imperative navigation. `router.push('/x')`, `router.replace('/x')`, `router.back()`.
- `useNavigation` — the lower-level navigator handle. We use it for `addListener('beforeRemove', ...)` which `router` doesn't expose.
- `SafeAreaView` from `react-native-safe-area-context`, **not** the one from `react-native`. The one from `react-native` is broken on Android. Use the context one — always.

```tsx
import { useLocationTracker } from '@/hooks/useLocationTracker';
import { SessionMap } from '@/components/session/SessionMap';
import { StatsSheet } from '@/components/session/StatsSheet';
import { PermissionGate } from '@/components/session/PermissionGate';
```

These four are *our* code. The `@/` is a path alias defined in `tsconfig.json` — `@/` means "project root." Without it you'd write `'../../hooks/useLocationTracker'` and it would be a nightmare.

### 1.2 The component signature

```tsx
export default function SessionScreen() {
```

`export default` because Expo Router's file-based routing expects each `app/*.tsx` to default-export a component. Named exports won't be picked up by the router.

### 1.3 The first three lines of the body — the most important pattern in the file

```tsx
const t = useLocationTracker();
const [saving, setSaving] = useState(false);
const nav = useNavigation();
```

- `t` is the brain. Calling `useLocationTracker()` gives us **the entire session state and every function that mutates it.** Renamed to `t` because we type it 30 times.
- `saving` is local UI state — we only need it to show "Saving…" text while Firestore upload is in flight. It doesn't belong inside the tracker hook because it's about *this screen's UI*, not about the session itself. **This split — global brain state vs. local UI state — is a senior-dev habit.**
- `nav` is the navigator handle, used for the back-button intercept below.

> **Why this exists:** if you put `saving` inside `useLocationTracker`, the hook gets contaminated with UI concerns. The hook should be reusable in any screen, even a screen that doesn't show "Saving…". Keep concerns separated.

### 1.4 The auto-start effect

```tsx
useEffect(() => {
  if (t.status === 'idle') {
    t.start();
  }
}, [t.status]);
```

When the screen first mounts, `t.status` is `'idle'`. After mount, this effect runs and calls `t.start()`. `start()` flips status to `'tracking'`, which triggers a re-render, which re-runs this effect — but now the `if` guard is false, so nothing happens.

> **The trick — why the dependency array is `[t.status]` and not `[t]`:** `t` is a fresh object on every render (the hook returns a new `{}` each time). If we used `[t]`, this effect would fire every render, calling `start()` repeatedly. Using `[t.status]` only re-runs when the status string changes. The eslint rule `exhaustive-deps` complains about this — we silence it with the comment because we know what we're doing.
>
> **Bigger lesson:** when a hook returns an object, never put the object in a dependency array directly. Pick the specific fields that matter.

### 1.5 The back-button intercept

```tsx
useEffect(() => {
  const unsub = nav.addListener('beforeRemove', (e) => {
    if (t.status === 'tracking' || t.status === 'paused') {
      e.preventDefault();
      Alert.alert('Session in progress', 'What do you want to do?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => { t.stop(); nav.dispatch(e.data.action); } },
        { text: 'Stop & Save', onPress: async () => { await handleStop(); nav.dispatch(e.data.action); } },
      ]);
    }
  });
  return unsub;
}, [nav, t.status]);
```

What's happening:
- React Navigation fires `beforeRemove` whenever the user is about to leave a screen — back swipe, hardware back button, `router.back()`, anything.
- `e.preventDefault()` cancels that navigation.
- We pop a 3-button alert.
- Each button decides whether to actually leave: `nav.dispatch(e.data.action)` re-fires the original navigation event, and now (because we don't call `preventDefault()` again) it goes through.
- `return unsub;` — this is React's cleanup contract. Whatever a `useEffect` returns is the cleanup function, fired before the next run or on unmount. `addListener` returns its own unsubscriber, so we just hand that back. **Memorize this pattern — it's everywhere.**

> **Why this exists:** if a user back-swipes mid-run, killing tracking with no warning would lose their data. The discard/save prompt is a UX guard. Strava and Garmin do this too.

### 1.6 `handleStop` — the save pipeline

```tsx
const handleStop = useCallback(async () => {
  t.stop();
  if (t.points.length < 2) { router.back(); return; }
  setSaving(true);
  ...
}, [t]);
```

Step by step:
1. `t.stop()` — kill the location stream and timer. Status flips to `'stopped'`.
2. If we have fewer than 2 points, the user barely opened the screen — nothing worth saving. Just go back.
3. Otherwise, set the local `saving` flag — this makes "Saving…" text appear in the header.

Then we build the input object and write it. Watch this closely:

```tsx
try {
  await savePending(input);
  const id = await saveSession(input);
  await clearPending();
  router.replace(`/session/${id}`);
} catch (err) {
  setSaving(false);
  Alert.alert('Save failed', 'Your session is kept locally. Retry?', [...]);
}
```

The order matters:
1. **`savePending(input)` first.** This writes to AsyncStorage on the device. **If the app crashes between here and Firestore, the session is recovered on next launch** (see `app/_layout.tsx`). This is "write-ahead logging" applied to a tracker.
2. `saveSession(input)` — this is the network call to Firestore. Returns the new document id.
3. `clearPending()` — remove the local copy now that the cloud has it.
4. `router.replace` (not `push`) — replace the session screen with the detail screen so the user can't back-button into a stopped session.

> **The trick — why `router.replace` and not `router.back()`?** `back()` would land them on the home screen, hiding the work they just did. `replace` swaps current screen → detail, which is the Strava-style "see your route immediately" UX you asked for.

### 1.7 The permission-denied early-return

```tsx
if (t.status === 'permission-denied') {
  return <PermissionGate canAskAgain={t.canAskAgain} onRequest={t.requestPermission} />;
}
```

A common pattern: **render an entirely different tree based on state.** Don't try to conditionally render the map AND the permission gate inside one tree — that gets ugly fast. Just early-return.

### 1.8 The JSX tree

```tsx
return (
  <View style={{ flex: 1, backgroundColor: colors.surface }}>
    <SessionMap ... />
    <SafeAreaView edges={['top']} pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16 }}>
        <Pressable onPress={() => router.back()} style={...}>
          <Text>←</Text>
        </Pressable>
        {saving && <Text>Saving…</Text>}
      </View>
    </SafeAreaView>
    <StatsSheet ... />
  </View>
);
```

Decoded:
- Outer `<View>` with `flex: 1` — fills the screen. Default flex is `column`.
- `<SessionMap>` mounts first → bottom of the z-stack.
- `<SafeAreaView edges={['top']}>` — a transparent layer above the map containing the back button. `edges={['top']}` says "only pad for the notch, not the bottom."
- `pointerEvents="box-none"` — **trick alert.** This means "touches pass through this view to children below, but children of *this* view can still receive touches." Without it, the map below the safe-area would be untouchable wherever the safe-area extends. Memorize this prop — you'll need it.
- `position: 'absolute'` — overlay on top of the map, not stacked beneath it.
- `<StatsSheet>` is the bottom sheet — last child wins z-index, so it draws on top.

> **The z-index trick in RN:** there's no `z-index` like CSS. In RN, **the order of siblings determines z-index** — later siblings render on top. So map → safe area → stats sheet, in that source order, gives you map at the back and sheet on top.

---

## Part 2 — `hooks/useLocationTracker.ts` — the brain

This is where most of the cleverness lives. Read it twice. Then we walk through it.

### 2.1 Why a custom hook at all?

A hook is just a function whose name starts with `use` and that calls other hooks. By convention, hooks **own state and side effects**, components consume them. The reason we wrote our own:

- The session screen needs ~10 pieces of state (status, points, steps, heading, …).
- It needs to subscribe to multiple OS APIs (location, heading, pedometer).
- It needs to clean all of those up on unmount.

If we put this in `SessionScreen`, the file would be 400 lines and untestable. Extracting it gives us a small, focused, testable unit.

### 2.2 The state declarations

```tsx
const [status, setStatus] = useState<TrackerStatus>('idle');
const [points, setPoints] = useState<TrackPoint[]>([]);
const [elapsedSec, setElapsedSec] = useState(0);
const [canAskAgain, setCanAskAgain] = useState(true);
const [heading, setHeading] = useState<number | null>(null);
const [steps, setSteps] = useState(0);
const [initialPos, setInitialPos] = useState<{ lat: number; lng: number } | null>(null);
```

**Rule of thumb:** if changing a value should redraw the UI → `useState`. Otherwise → `useRef`.

These are all *displayed* values: the polyline (points), the timer text (elapsedSec), the steps stat, the compass arrow (heading). Each `setX(...)` triggers a re-render.

### 2.3 The refs — quiet state

```tsx
const startedAtRef = useRef<number | null>(null);
const pausedAccumMsRef = useRef(0);
const pauseStartRef = useRef<number | null>(null);
const segmentRef = useRef(0);
const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
const lastPointRef = useRef<TrackPoint | null>(null);
const headingSubRef = useRef<Location.LocationSubscription | null>(null);
const pedSubRef = useRef<{ remove: () => void } | null>(null);
const pedBaselineRef = useRef<number | null>(null);
const pedAccumBeforeResumeRef = useRef(0);
const pausedRef = useRef(false);
```

Each of these:
- Persists across renders (good — we need it to remember things).
- **Doesn't trigger re-render when changed** (also good — we don't want timestamp arithmetic to repaint the screen 100 times).
- Read/write via `.current`.

Quick tour:
- `startedAtRef` — wall-clock timestamp the session began. Used in the timer math.
- `pausedAccumMsRef` — total milliseconds spent paused. Subtracted from elapsed time.
- `pauseStartRef` — when the current pause began (null if not paused).
- `segmentRef` — increments each time we resume; tags new points so the polyline can break.
- `tickRef` — handle to the `setInterval`, so we can clear it.
- `lastPointRef` — the last *accepted* GPS point, so the filter can compare jumps.
- `headingSubRef`, `pedSubRef` — subscription handles, so we can cancel them.
- `pedBaselineRef` — the cumulative-since-boot reading at the moment we started or resumed; we subtract it.
- `pedAccumBeforeResumeRef` — total steps before the current resume window.
- `pausedRef` — duplicate of `status === 'paused'` but in ref form, **so the location callback can check it without being a stale closure** (see 2.4).

> **The most important trick in this file — duplicate state in refs.** Why is `pausedRef` a thing when we already have `status`? Because the location callback was registered ONCE in a `useEffect` and *captured the `status` value at that moment*. When status later changes, the callback's view of `status` is stuck at the old value. That's a **stale closure**. By writing to `pausedRef.current` synchronously inside `pause()`, the callback reads the live value — refs are always live, state is captured.
>
> Memorize this. Almost every advanced React bug is a stale closure.

### 2.4 The location subscription

```tsx
useEffect(() => {
  const unsub = subscribeLocations((locs) => {
    if (!startedAtRef.current || pausedRef.current) return;
    const accepted: TrackPoint[] = [];
    for (const loc of locs) {
      ...
      const next: TrackPoint = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        t: Date.now() - startedAtRef.current,
        speed,
        accuracy: loc.coords.accuracy ?? null,
        segment: segmentRef.current,
        heading: rawHeading != null && rawHeading >= 0 ? rawHeading : null,
      };
      if (!acceptPoint(lastPointRef.current, next)) continue;
      lastPointRef.current = next;
      accepted.push(next);
    }
    if (accepted.length) setPoints((prev) => [...prev, ...accepted]);
  });
  return unsub;
}, []);
```

This effect runs **once** when the hook mounts (empty dep array). It subscribes our callback to the pub/sub in `lib/locationTask.ts`. Tricks galore here:

1. **Two early-exit guards.** If we haven't started or we're paused, drop everything. The pause guard is why `pausedRef` exists.
2. **`t: Date.now() - startedAtRef.current`** — wall-clock relative time. We **don't** use `loc.timestamp` because iOS reports the GPS satellite clock, which can drift seconds away from device time, breaking dt math. Lesson learned the hard way (see git history).
3. **Negative coercion** — iOS reports `speed: -1` and `heading: -1` when unknown. We convert those to `null`. Without this you'd see "−3.6 km/h" on screen.
4. **`segment: segmentRef.current`** — every accepted point gets tagged with the current segment id. The map uses this to break the polyline at pause/resume boundaries.
5. **`acceptPoint(lastPointRef.current, next)`** — the filter from `lib/geo.ts`. Rejects bad fixes.
6. **Functional `setPoints((prev) => ...)`** — using the callback form because we don't trust whatever `points` value the closure captured. The functional form always sees the latest array.
7. **Batch the additions** — we collect into `accepted[]` then do one `setPoints` at the end, instead of N separate state updates. Fewer re-renders.

### 2.5 The timer — `startTick`

```tsx
const startTick = useCallback(() => {
  clearTick();
  tickRef.current = setInterval(() => {
    if (!startedAtRef.current) return;
    const raw = Date.now() - startedAtRef.current - pausedAccumMsRef.current;
    setElapsedSec(Math.max(0, Math.floor(raw / 1000)));
  }, 1000);
}, []);
```

Once a second:
- Read the wall clock.
- Subtract the start time.
- Subtract total paused time.
- That's the elapsed time. Convert to seconds.

> **The trick — why don't we just `setElapsedSec(prev => prev + 1)` in the interval?** Because if the OS pauses our timer (background, throttled), we'd drift. Using wall-clock arithmetic, **drift is impossible**: we always recompute from `Date.now()`. This is the same reason browser stopwatches use this pattern.

### 2.6 `start()` — the whole choreography

```tsx
const start = useCallback(async () => {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status !== 'granted') {
    const ok = await requestPermission();
    if (!ok) return;
  }
  startedAtRef.current = Date.now();
  pausedAccumMsRef.current = 0;
  pauseStartRef.current = null;
  segmentRef.current = 0;
  lastPointRef.current = null;
  pausedRef.current = false;
  setPoints([]);
  setElapsedSec(0);

  setStatus('tracking');
  startTick();

  Location.getLastKnownPositionAsync({ maxAge: 60_000 }).then(...);
  Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then(...);

  await startBackgroundLocation();

  try {
    headingSubRef.current = await Location.watchHeadingAsync(...);
  } catch {}

  await startPedometer();
}, [requestPermission, startTick, startPedometer]);
```

The order is deliberate:

1. **Check permission first.** If we don't have it, request it. If denied, bail.
2. **Reset all session state.** Fresh start every time.
3. **Flip the UI to tracking and start the timer immediately** — don't make the user wait for GPS. This is the fix for the "11-second lag" bug.
4. **Fire-and-forget initial position.** `getLastKnownPositionAsync` is instant (returns a cached fix). `getCurrentPositionAsync` is slow (waits for a real fix). We start both in parallel and let whichever resolves later overwrite. **Don't `await` either** — they shouldn't block.
5. **`await startBackgroundLocation()`** — actually start streaming.
6. **Heading + pedometer** — separate subscriptions, each in a try/catch because not all devices have them.

### 2.7 Pause / resume / stop — the state-machine transitions

```tsx
const pause = useCallback(() => {
  if (status !== 'tracking') return;
  pauseStartRef.current = Date.now();
  pausedRef.current = true;
  pedAccumBeforeResumeRef.current = steps;
  pedBaselineRef.current = null;
  clearTick();
  setStatus('paused');
}, [status, steps]);
```

The pedometer hand-off is the subtle part:
- Snapshot current steps into `pedAccumBeforeResumeRef`.
- Clear the baseline so the next resume reading becomes the new baseline.
- On resume, the formula is `pedAccumBeforeResume + (current - baseline)`, so resumed steps continue from where we stopped.

```tsx
const resume = useCallback(async () => {
  if (status !== 'paused') return;
  if (pauseStartRef.current) {
    pausedAccumMsRef.current += Date.now() - pauseStartRef.current;
    pauseStartRef.current = null;
  }
  segmentRef.current += 1;
  lastPointRef.current = null;
  pausedRef.current = false;
  setStatus('tracking');
  startTick();
}, [status, startTick]);
```

- Add the duration of this pause to the total paused time.
- Increment the segment so new points form a new polyline piece.
- Reset `lastPointRef` so we don't reject the first point after the pause for being "too far" from the pre-pause point.
- Note: we do **not** restart `startBackgroundLocation()` — it kept running through the pause. We just toggled `pausedRef` so the listener was dropping points.

```tsx
const stop = useCallback(() => {
  pausedRef.current = true;
  headingSubRef.current?.remove();
  pedSubRef.current?.remove();
  clearTick();
  void stopBackgroundLocation();
  ...
  startedAtRef.current = null;
  setStatus('stopped');
}, [status]);
```

- Drop heading + pedometer subscriptions.
- Stop background location.
- `void stopBackgroundLocation()` — `void` here is a TypeScript idiom that says "I'm intentionally not awaiting this Promise." Without it, ESLint complains.
- Set `startedAtRef` to null so the location callback's first guard fails — extra defense in depth.

### 2.8 Cleanup `useEffect`

```tsx
useEffect(() => () => {
  headingSubRef.current?.remove();
  pedSubRef.current?.remove();
  clearTick();
  void stopBackgroundLocation();
}, []);
```

That's a `useEffect` whose body is `() => () => { ... }` — a function that returns a function. The returned function is the cleanup. Because the dep array is `[]`, the effect runs once on mount and the cleanup runs once on unmount. **This is our safety net** — even if `stop()` is never called, leaving the screen frees all resources.

### 2.9 Derived stats with `useMemo`

```tsx
const stats = useMemo(() => computeStats(points, elapsedSec), [points, elapsedSec]);
const currentSpeed = useMemo(() => { ... }, [points]);
```

`useMemo(fn, deps)` re-runs `fn` only when a dep changes, otherwise returns the cached result. Why bother?
- `computeStats` walks every point in the array. If we recomputed it during *every* render (timer tick, status change, etc.), it'd waste work.
- `useMemo` confines the work to the renders where it actually changed.

`currentSpeed` has its own memo because it depends only on `points`, not on `elapsedSec`. Splitting them lets them invalidate independently.

### 2.10 The return value

The hook returns one big object:

```tsx
return { status, points, durationSec: elapsedSec, ..., start, pause, resume, stop };
```

That's how the screen uses everything. **Notice we rename `elapsedSec` to `durationSec` at the boundary** — internal name vs. public API. The screen sees the cleaner name.

---

## Part 3 — `lib/locationTask.ts` — the wire

This file is unusual because it does work at module-load time. Open it and read along.

### 3.1 The pub/sub at the top

```tsx
type Listener = (locs: Location.LocationObject[]) => void;
const listeners = new Set<Listener>();

export function subscribeLocations(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function emit(locs: Location.LocationObject[]) {
  listeners.forEach((fn) => { try { fn(locs); } catch {} });
}
```

A textbook observer pattern. A `Set` of functions; subscribers add themselves and get back an unsubscribe; `emit` fires them all. The `try { fn(locs); } catch {}` swallows errors so one buggy listener can't break the others.

### 3.2 The TaskManager registration

```tsx
TaskManager.defineTask(LOCATION_TASK, ({ data, error }) => {
  if (error) return;
  const payload = data as { locations?: Location.LocationObject[] } | undefined;
  if (payload?.locations?.length) emit(payload.locations);
});
```

This is **module-load code, not React code.** The moment `import '@/lib/locationTask'` runs anywhere, this `defineTask` registers the task with Expo's native TaskManager. That's why we import it from `app/_layout.tsx` — to guarantee registration before any screen mounts.

> **Why module-level?** Because TaskManager runs **headless** — when the OS spins up our app to deliver a background location update, there's no React tree, no component, no hooks. Just the JS runtime. The task callback is the entry point. If you defined the task inside a component, it wouldn't be registered when the OS needs it.

### 3.3 The Expo Go branch

```tsx
const isExpoGo = Constants.appOwnership === AppOwnership.Expo || Constants.appOwnership === 'expo';

if (isExpoGo) {
  if (foregroundSub) return;
  foregroundSub = await Location.watchPositionAsync({...}, (location) => emit([location]));
  return;
}
```

In Expo Go, TaskManager and foreground services don't work. So we detect that environment and fall back to **the same pub/sub**, just fed by a foreground subscription. The rest of the app doesn't care which side of this branch ran — `subscribeLocations` works either way.

> **The trick — same listener interface, two implementations.** This is the **Strategy pattern.** When you need different behavior for different environments but the consumer shouldn't care, hide the difference behind a uniform API. `subscribeLocations` is that API.

---

## Part 4 — `lib/geo.ts` — the filter

Pure functions, no React, easy to test. Two things matter here:

### 4.1 `haversineMeters`

The math for distance on a sphere. You don't need to derive it — but you should understand:
- Treats the earth as a perfect sphere (radius 6,371,000m). Slightly wrong, fine for fitness.
- Returns meters between two `{lat, lng}` points.
- Used by `acceptPoint` (to measure jumps) and `computeStats` (to sum distance).

### 4.2 `acceptPoint` — the indoor jitter killer

```tsx
export function acceptPoint(prev: TrackPoint | null, next: TrackPoint): boolean {
  if (next.accuracy != null && next.accuracy > ACCURACY_MAX_M) return false;
  if (prev === null) return true;
  const dt = next.t - prev.t;
  if (dt < MIN_DT_MS) return false;
  const d = haversineMeters(prev, next);
  const uncertainty = Math.max(prev.accuracy ?? 0, next.accuracy ?? 0);
  if (d < Math.max(MIN_STEP_M, uncertainty * JITTER_ACCURACY_FACTOR)) return false;
  if (dt > 100) {
    const mps = d / (dt / 1000);
    if (mps > MAX_SPEED_MPS) return false;
  }
  return true;
}
```

Four filters in sequence:

1. **Accuracy ceiling** — fix has ±50m uncertainty? Trash. Drop it.
2. **First point passes free** — nothing to compare against.
3. **Time-monotonic** — if `next.t < prev.t` somehow, drop it.
4. **Movement vs uncertainty** — the clever part. If your accuracy ring is 10m wide, a 2m jump might be real or might be noise. Require movement > half the uncertainty before believing it. **This is what made indoor sessions stop showing fake 27m walks.**
5. **Speed sanity** — apparent velocity > 30 m/s? GPS hiccup. Drop.

### 4.3 `computeStats`

Walks the array, sums distance per same-segment leg, picks max GPS doppler speed (not derived — derived spikes on jitter), computes pace = duration / km when both are positive.

> **The trick — max speed only uses GPS-reported speed, never `distance/dt`.** Two consecutive jittery fixes seconds apart can produce 32 km/h "speed" out of thin air. iOS's reported `speed` field comes from Doppler shift, which is physically grounded — it goes to 0 when you're standing still. So we trust it and ignore derived numbers for the max stat.

---

## Part 5 — `components/session/SessionMap.tsx`

A "dumb" component that takes props and draws a map. Two effects, both about the camera.

### 5.1 The follow-camera effect

```tsx
useEffect(() => {
  if (!follow || points.length === 0 || !mapRef.current) return;
  const last = points[points.length - 1];
  const cameraParams = {
    center: { latitude: last.lat, longitude: last.lng },
    zoom: 17,
    altitude: 1500,
    pitch: 0,
  };
  const h = heading != null && heading >= 0
    ? heading
    : last.heading != null && last.heading >= 0 ? last.heading : null;
  if (h != null) cameraParams.heading = h;
  mapRef.current.animateCamera(cameraParams, { duration: 500 });
}, [follow, points, heading]);
```

Every time a new point arrives or the heading changes, we tell the native map: "smoothly slide your camera to here."

> **The trick — compass heading falls back to GPS heading.** GPS heading is only valid when *moving*. When you're standing still, we fall back to compass heading so the map still rotates as you turn the phone. That's how Google Maps and Apple Maps both behave.

### 5.2 The fit-to-route effect

```tsx
useEffect(() => {
  if (follow || didFitRef.current || points.length < 2 || !mapRef.current) return;
  const coords = points.map((p) => ({ latitude: p.lat, longitude: p.lng }));
  mapRef.current.fitToCoordinates(coords, {
    edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
    animated: false,
  });
  didFitRef.current = true;
}, [follow, points]);
```

When `follow={false}` (i.e., the **detail screen** showing a saved session), zoom the camera so the whole route is visible with some padding. The `didFitRef` guard means we only do this **once** — otherwise every state change would re-fit the camera and the user couldn't pan.

### 5.3 The polyline rendering

```tsx
{segments.map((seg, idx) => {
  const coords = seg.map((p) => ({ latitude: p.lat, longitude: p.lng }));
  return (
    <React.Fragment key={idx}>
      <Polyline coordinates={coords} strokeColor={colors.primary + '55'} strokeWidth={12} />
      <Polyline coordinates={coords} strokeColor={colors.primary} strokeWidth={5} />
    </React.Fragment>
  );
})}
```

Two tricks here:

1. **Segments break on pause/resume.** `splitSegments` (above) groups points by `segment` id so the polyline doesn't draw a phantom line connecting the pre-pause and post-resume points.
2. **Two stacked polylines** for the Strava glow look — a thicker translucent halo (`+ '55'` is a hex alpha, ~33% opacity) under a thinner solid stroke. Cheap, looks expensive.

---

## Part 6 — `components/session/StatsSheet.tsx`

A `BottomSheet` from `@gorhom/bottom-sheet` with three snap points (15%, 50%, 88%). Mostly layout. The trick:

```tsx
{props.status === 'tracking' ? (
  <Button label="Pause" onPress={props.onPause} />
) : (
  <Button label="Resume" onPress={props.onResume} />
)}
```

The same button slot **becomes** Pause or Resume depending on status. This is a small, tight piece of conditional rendering — much cleaner than rendering both and hiding one with CSS.

---

## Part 7 — How a single GPS fix turns into a redrawn polyline

Let's trace one full lap, end to end:

```
1. OS GPS reports a new fix to the phone.
2. native expo-location module receives it and posts to JS.
3. lib/locationTask.ts TaskManager callback (or Expo Go fallback) fires.
4. It calls emit([location]).
5. The Set of listeners runs. One of them is:
6.   useLocationTracker's subscribeLocations callback.
7.   It checks pausedRef and startedAtRef — both fine, continue.
8.   Builds a TrackPoint with t = Date.now() - startedAtRef.current.
9.   Coerces -1 speed/heading to null.
10.  Calls acceptPoint(lastPointRef.current, next):
11.    accuracy check passes,
12.    movement > max(3m, accuracy*0.5) — passes,
13.    speed sanity passes.
14.  Updates lastPointRef.current = next.
15.  Pushes to accepted[] and calls setPoints(prev => [...prev, ...accepted]).
16. React schedules a re-render of SessionScreen.
17. SessionScreen re-renders, computing stats via useMemo (runs because points changed).
18. <SessionMap> re-renders with new points.
19. The follow-camera useEffect fires (deps changed) — calls mapRef.current.animateCamera.
20. The polyline children re-render — react-native-maps diffs the coords prop and tells native to redraw.
21. Android's GoogleMap / iOS's MKMapView updates the visible polyline.
22. <StatsSheet> re-renders with new distance/speed/etc.
23. User sees a longer line and a higher distance number.
```

**21 steps for one fix.** And it happens once a second. None of it requires you to think about it — that's the magic of the architecture.

---

## Part 8 — Things that look weird until you know why

| Weird thing | Why it's there |
|---|---|
| `import '@/lib/locationTask';` with no usage | Triggers `TaskManager.defineTask` to register the task at module load. |
| `useRef` for `pausedRef` AND `useState` for status | Refs read live in callbacks; state can be stale-captured. |
| `t: Date.now() - startedAt`, not `loc.timestamp` | iOS GPS clock can drift, breaks dt math. |
| Negative speed coerced to null | iOS reports `-1` for unknown. |
| `void stopBackgroundLocation()` | Tells TS "I'm not awaiting this on purpose." |
| `setPoints(prev => ...)` instead of `setPoints([...points, next])` | Functional update reads latest state, immune to stale closures. |
| `pointerEvents="box-none"` on the safe-area | Lets the map below receive touches outside the buttons. |
| `router.replace` after stop, not `router.back` | Lands user on detail screen, not home. |
| `MIN_STEP_M * uncertainty * 0.5` in filter | Indoor jitter kills sessions otherwise. |
| `'#' + colors.primary + '55'` polyline halo | Fake glow effect via stacked polylines + alpha. |

---

## Part 9 — Self-test

You understand the session subsystem if you can answer all of these without looking:

1. What runs first: `useEffect` body or the JSX return?
2. Why is `t.start()` called inside a `useEffect` and not directly in the function body?
3. If we deleted `pausedRef`, what specific bug appears?
4. Why is `lastPointRef` reset on resume?
5. What would happen if we used `loc.timestamp` instead of `Date.now()` in the point's `t` field?
6. Why is the back button's `useEffect` dependency `[nav, t.status]` and not `[nav, t]`?
7. If `savePending` succeeds but `saveSession` throws, what does the user see, and what's stored where?
8. Why doesn't the polyline draw a line through paused regions?
9. What's the difference between `setPoints([...points, next])` and `setPoints(prev => [...prev, next])`?
10. What does `void` mean in `void stopBackgroundLocation()`?

If you stumble on any, go re-read that section. Then come ask me to grill you live.

---

You are now closer to mastering this codebase than 95% of people who'd open it. Welcome to the senior side of React Native.
