# GPS Tracking

## 1.Summary

Trackooo is a Strava-style GPS workout tracker. The user opens the app, taps **Start**, and the app records a route polyline, distance, duration, current/average/max speed, pace, step count, and compass heading. Tracking continues when the screen is locked or the app is backgrounded. On stop, the session is persisted to Firestore and the user is taken straight to a route summary screen. A history tab lists past sessions.

Beyond the feature surface, this project was an exercise in mobile engineering depth: GPS noise filtering, sensor fusion, native background services, OS permission flows, state-machine design in React, and crash-resilient persistence. The remainder of this document covers what was built, how the harder problems were solved, and the engineering lessons taken away.

---

## 2. What was built

### 2.1 User-visible features

| Feature                                         | Implementation                                                                                           |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Start a session and record a route              | `app/session.tsx` mounts the tracker; polyline grows as the user moves                                   |
| Live stats — distance, time, speed, pace, steps | `@gorhom/bottom-sheet` drawer with three snap points                                                     |
| Pause / resume mid-session                      | New polyline segment on resume so paused gaps don't draw a line                                          |
| Stop and save                                   | Crash-safe persistence to Firestore; user is taken directly to the summary screen                        |
| Background recording                            | Continues when screen is off / app is backgrounded (iOS `UIBackgroundModes`, Android foreground service) |
| Indoor step counting                            | Hardware step sensor via `expo-sensors` Pedometer                                                        |
| Map rotation by compass                         | Map turns with the phone, even standing still (uses `watchHeadingAsync`)                                 |
| Strava-style follow camera                      | Lower zoom, glow polyline, smooth `animateCamera` per fix                                                |
| Route summary on saved sessions                 | `fitToCoordinates` frames the entire route                                                               |
| Activity history                                | Firestore query, virtualized `<FlatList>`, pull-to-refresh                                               |
| Permission gate                                 | Custom screen if location is denied                                                                      |
| Crash recovery                                  | Pending session in `AsyncStorage`, replayed to Firestore on next launch                                  |
| Back-button safety                              | Mid-session back gesture prompts Discard / Stop & Save / Cancel                                          |

### 2.2 Source layout

```
app/
├── _layout.tsx                ← Stack root; registers TaskManager task
├── (tabs)/
│   ├── _layout.tsx            ← Tab bar
│   ├── index.tsx              ← Home / Start
│   └── activity.tsx           ← Past sessions list
├── session.tsx                ← Active recording screen
└── session/[id].tsx           ← Saved session detail

components/
└── session/
    ├── SessionMap.tsx         ← react-native-maps wrapper
    ├── StatsSheet.tsx         ← Bottom sheet UI
    ├── PermissionGate.tsx     ← Permission denied state
    └── darkMapStyle.ts        ← Custom dark Google Maps style

hooks/
└── useLocationTracker.ts      ← Session brain (state + side effects)

lib/
├── locationTask.ts            ← TaskManager + pub/sub (background + Expo Go fallback)
├── geo.ts                     ← Haversine, jitter filter, stats math
├── sessions.ts                ← Firestore CRUD
├── pendingSession.ts          ← AsyncStorage write-ahead log
├── firebase.ts                ← Firestore init
└── format.ts                  ← UI formatters

docs/
├── session-deep-dive.md       ← Line-by-line tutorial of the session subsystem
├── maps-and-tracking-no-billing.md  ← Maps options without Google billing
└── project-report.md          ← (this document)
```

---

## 3. Architecture

### 3.1 Layered design

```
                ┌──────────────────────────────┐
   UI layer     │  app/session.tsx, components │   (no direct OS access)
                ├──────────────────────────────┤
   State layer  │  hooks/useLocationTracker    │   (state machine, derives stats)
                ├──────────────────────────────┤
   Wire layer   │  lib/locationTask.ts         │   (pub/sub, env strategy)
                ├──────────────────────────────┤
   Pure layer   │  lib/geo.ts, lib/format.ts   │   (no React, no I/O)
                ├──────────────────────────────┤
   I/O layer    │  lib/sessions, pendingSession│   (Firestore, AsyncStorage)
                ├──────────────────────────────┤
   Native       │  expo-location / sensors / TM│   (OS APIs)
                └──────────────────────────────┘
```

Each layer only depends on the one(s) below it. The pure layer has zero dependencies and is trivially unit-testable. The UI layer is "dumb" — it reads props and dispatches actions; it has no knowledge of GPS, sensors, or Firestore.

### 3.2 Data flow during an active session

```
OS GPS  ──►  expo-location native  ──►  TaskManager task / foreground sub
                                                ▼
                                  lib/locationTask.ts  emit(locs)
                                                ▼
                                  Set<Listener>.forEach
                                                ▼
                                  useLocationTracker callback
                                                ▼
                                  acceptPoint() filter (lib/geo.ts)
                                                ▼
                                  setPoints(prev => [...prev, accepted])
                                                ▼
                                  React re-renders SessionScreen
                                                ▼
                              <SessionMap> + <StatsSheet> redraw
```

A new GPS fix arrives roughly once a second. Every step in this pipeline is non-blocking. The render cost stays flat as the route grows because `react-native-maps`' Polyline only diffs the appended slice, not the whole array.

---

## 4. challenges and how they were solved

### 4.1 Indoor GPS jitter producing fake distance

**Symptom.** Phone resting on desk; after 4 minutes, app showed 27 m of distance, 32 km/h max speed, 0.3 km/h average.

**Cause.** Indoor GPS fixes have ±20–60 m of uncertainty. Each fix lands somewhere in that ring. Two consecutive fixes are 5 m apart not because the phone moved but because the noise resampled. Naive distance summation accumulates this noise into a fake walk.

**Fix (`lib/geo.ts`).** Movement must exceed a fraction of the GPS uncertainty before being counted. Concretely: a leg is rejected unless the move exceeds `max(MIN_STEP_M, max(prev.accuracy, next.accuracy) * JITTER_ACCURACY_FACTOR)`. With `JITTER_ACCURACY_FACTOR = 0.7` and `MIN_STEP_M = 5`, a fix with 10 m accuracy needs at least 7 m of motion to register. This kills the indoor noise without sacrificing real walking outdoors (where accuracy is typically 5–10 m and walking pace is 1.4 m/s ≈ 2.8 m per 2 s sample).

### 4.2 iOS reporting `-1` for unknown speed and heading

**Symptom.** Speed display showed "−3.6 km/h" briefly at session start. Compass arrow pointed in nonsense direction when stationary.

**Cause.** iOS `CLLocation.speed` and `course` return `-1` when the GPS engine can't compute them (e.g. just after a cold start). Our code passed those through.

**Fix.** In the location callback, coerce negative values to `null`. Downstream code already handled `null` correctly. One line per field; entire bug class eliminated.

### 4.3 11-second lag between tapping Start and the timer beginning

**Cause.** `start()` was awaiting `getCurrentPositionAsync` before flipping status to `'tracking'`. iOS can take 5–15 s to acquire the first high-accuracy fix.

**Fix.** Reorder `start()`: flip status and start the timer **first**, then fire-and-forget `getLastKnownPositionAsync` and `getCurrentPositionAsync` for the initial map region. The user sees an instant response; the map zooms in once a fix is available. UX win at zero cost.

### 4.4 Pedometer baseline off-by-one

**Symptom.** Step count jumped from 0 to 9 immediately, then incremented normally.

**Cause.** The original baseline math used `pedBaseline = res.steps - 1`, treating the first reading as if it were already step 1. But the first emitted reading on iOS is _cumulative since subscription start_, which is non-zero by the time we receive it.

**Fix.** Treat the first reading as the baseline itself and skip it. Subsequent readings emit `current - baseline`. On pause, snapshot `pedAccumBeforeResume = currentSteps`, clear the baseline, and on resume restart from `pedAccumBeforeResume + (current - newBaseline)`.

### 4.5 GPS clock vs wall clock drift

**Symptom.** Distance and pace stuck at 0 even when clearly moving.

**Cause.** The point's `t` (relative time) was computed from `loc.timestamp - startedAtRef.current`. iOS reports `loc.timestamp` from the GPS satellite clock, which can drift seconds away from device time. Negative dt values caused `acceptPoint`'s monotonicity check to reject every point.

**Fix.** Compute `t = Date.now() - startedAtRef.current` in the listener, ignoring `loc.timestamp`. Wall-clock based, monotonic, dt always positive.

### 4.6 iOS background sensor-fusion drift

**Symptom.** Phone in pocket, app backgrounded, user shaking phone (testing). App reports 80 m walked and 12 km/h speed. Did not happen in foreground.

**Cause.** When the app is backgrounded, iOS aggressively fuses Core Motion (accelerometer/pedometer) with cached GPS to extrapolate position. Shaking triggers Core Motion to think you're walking; iOS then reports optimistic accuracy values (8–10 m) that don't reflect reality. Our jitter filter trusts the reported accuracy, so it lets these fake fixes through.

**Fix (latest).** Doppler cross-check. iOS `coords.speed` comes from satellite frequency shift, not Core Motion — it's physically grounded and reports 0 when the phone is genuinely not moving. The new check: if both prev and next fixes have a reliable doppler speed AND both are below 0.5 m/s ("stationary"), but the position-derived speed is > 1 m/s, the leg is rejected. Core Motion can fool the position; it can't fake a Doppler shift. Combined with a tighter accuracy ceiling (15 m) and stricter jitter factor (0.7), this should eliminate background-shake artifacts.

### 4.7 Stop button landed user on Home, not on the route summary

**Cause.** `handleStop` ended with `router.back()` after saving.

**Fix.** Use `router.replace('/session/${id}')` so the active session screen is replaced by its detail screen — the user sees their route immediately, can't back-button into the now-stopped session.

### 4.8 Crash-safe persistence

**Concern.** What if Firestore upload fails or the app crashes mid-save?

**Solution.** A two-step write:

1. `savePending(input)` — writes the full session payload to AsyncStorage.
2. `saveSession(input)` — writes to Firestore, returns the document id.
3. `clearPending()` — removes the local copy.

If step 2 fails, the local copy stays. On next app launch, `app/_layout.tsx` checks for a pending session and replays it to Firestore, then clears. This is a write-ahead log applied to a fitness tracker — overkill for a hobby project, prudent for production.

### 4.9 Stale closures in subscription callbacks

**Concern.** The location listener subscribes once on mount (empty `useEffect` dep array). It captures whatever closure-state existed at that moment. When `pause()` later changes `status`, the listener's view of `status` is stale.

**Solution.** Mirror the relevant state into a ref (`pausedRef`). Refs are _live_ — reading `.current` always gets the latest value, even from inside an old closure. The listener consults `pausedRef.current` instead of `status`.

This is a paradigm React developers have to internalize: **state for rendering, refs for callbacks.** Once internalized, an entire class of bugs disappears.

---

## 5. Native platform details

### 5.1 iOS

- `Info.plist` keys: `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`, `NSMotionUsageDescription`.
- `UIBackgroundModes: ["location"]`.
- Foreground location permission requested first; background permission requested second (Apple guidance).
- `Location.Accuracy.BestForNavigation` + `activityType: Fitness` so iOS picks the pedestrian-tuned filtering.
- `showsBackgroundLocationIndicator: true` shows the blue pill at the top of the screen during background tracking — a transparency requirement and a UX cue.

### 5.2 Android

- Manifest: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `ACTIVITY_RECOGNITION`.
- `expo-location` plugin with `isAndroidBackgroundLocationEnabled` and `isAndroidForegroundServiceEnabled`.
- Foreground service is started by `Location.startLocationUpdatesAsync` with a `foregroundService.notificationTitle/Body/Color`. Required by Android 8+ for any background location.
- Step counter via `Sensor.TYPE_STEP_COUNTER` (accessed through `expo-sensors`). Cumulative-since-boot semantics handled by the baseline math.

### 5.3 Expo Go fallback

For development convenience, the app detects `Constants.appOwnership === 'expo'` and replaces the TaskManager-based background streaming with a foreground `watchPositionAsync`. The same pub/sub feeds it. The rest of the app is unaware which environment it's running in. This means we can iterate on most logic in Expo Go and only build a dev client when testing background behavior.

---

## 6. Testing approach

The pure layer (`lib/geo.ts`, `lib/format.ts`) is unit-test-friendly because it has no React, no I/O, no platform calls. Manual testing was used for everything above pure: foreground tracking, background tracking, pause/resume, crash recovery, permission denial, indoor vs outdoor, Expo Go vs dev client.

A future improvement would be:

- Unit tests for `acceptPoint` and `computeStats` covering the iOS-bug edge cases enumerated in §4 (negative speed, GPS clock drift, jitter rings, doppler stationarity).
- Snapshot tests for `format*` helpers.
- Integration test that synthesizes a route and verifies the recorded stats match expectation.

---

## 7. React Native learnings

This was my first non-trivial React Native project. Key concepts I had to learn beyond basic React:

| Concept                                | Where it shows up                      | Why it matters                                                 |
| -------------------------------------- | -------------------------------------- | -------------------------------------------------------------- |
| `useState` vs `useRef`                 | `useLocationTracker.ts`                | Renders vs quiet state. Wrong choice causes bugs.              |
| Stale closures                         | location listener vs `pausedRef`       | Most common React bug; refs solve it.                          |
| Effect cleanup                         | `return unsub` in every `useEffect`    | Subscription leaks otherwise.                                  |
| Functional `setState`                  | `setPoints(prev => ...)`               | Avoids closing over stale array.                               |
| Module-level side effects              | `defineTask` in `lib/locationTask.ts`  | TaskManager runs headless; can't use React lifecycle.          |
| Pub/sub wiring                         | `Set<Listener>` + `subscribeLocations` | Decouples native events from React.                            |
| File-based routing                     | `app/session/[id].tsx`                 | URL is the source of truth; default exports only.              |
| Native vs RN view stack                | `<View>`, `<Text>`, `<MapView>`        | Each becomes a real native view; no DOM.                       |
| Z-index by source order                | Map → SafeArea → StatsSheet            | RN doesn't have CSS z-index; siblings stack in order.          |
| `pointerEvents="box-none"`             | overlay layer above the map            | Touches pass through transparent overlays only with this prop. |
| Permission state machine               | foreground → background → motion       | Each platform requires a specific request order.               |
| Foreground service contract            | Android background location            | Notification is mandatory; can't be hidden.                    |
| Headless task contract                 | `TaskManager.defineTask`               | Runs without a UI; must be registered at module load.          |
| Imperative camera vs declarative props | `mapRef.animateCamera` + `<Polyline>`  | Some map operations don't fit React's data-flow model.         |
| Crash-resilient writes                 | AsyncStorage write-ahead               | Offline-first thinking.                                        |

The deepest learning was the discipline of **separating side-effect-bearing code from pure code**. Once `acceptPoint` and `computeStats` lived alone in `lib/geo.ts`, every "should this point count?" debate became a math question with a deterministic answer, not an interaction with the OS.

---

## 9. Known issues / open work

- **Single user, no auth** — sessions are stored against `userId: null`. Adding Firebase Auth is straightforward.
- **No offline map tiles** — the map shows a gray rectangle without a network connection. Could be addressed by switching to MapLibre + a bundled Protomaps file (see `maps-and-tracking-no-billing.md`).
- **No splits / lap UI** — distance and pace are session-level only.
- **No pause auto-detection** — Strava auto-pauses when speed drops to zero; this app requires manual pause.
