# GPS Tracking in React Native — A Complete Learning Guide

**Who this is for:** You're a beginner in React Native. You want to understand *how* and *why* every part of this GPS tracking feature works — not just what to type.

**How to read:** Each phase builds on the previous one. When a concept depends on something broader, it's explained inline (indented) so you never encounter an unexplained term.

**Reference project:** [`trackotest3`](file:///c:/Users/ahmed/Downloads/one14-docs/trackotest3) — a live GPS tracking app built with Expo.

---

## Table of Contents

- [Phase 0 — React & React Native Foundations](#phase-0--react--react-native-foundations)
- [Phase 1 — The Expo Ecosystem](#phase-1--the-expo-ecosystem)
- [Phase 2 — GPS & Location APIs](#phase-2--gps--location-apis)
- [Phase 3 — Geo Math (The Brain)](#phase-3--geo-math-the-brain)
- [Phase 4 — The Tracker State Machine (The Heart)](#phase-4--the-tracker-state-machine-the-heart)
- [Phase 5 — Map & UI (The Face)](#phase-5--map--ui-the-face)
- [Phase 6 — Persistence with Firebase](#phase-6--persistence-with-firebase)
- [Phase 7 — Real-World Debugging Lessons](#phase-7--real-world-debugging-lessons)

---

## Phase 0 — React & React Native Foundations

Before touching GPS, you need to understand the building blocks. If you already know React, skim this phase for the React Native-specific parts.

### 0.1 What is React?

React is a JavaScript library for building UIs out of **components** — small, reusable pieces that each manage their own state and rendering.

```
┌─────────────────────────────────┐
│         SessionScreen           │  ← One screen = one component
│  ┌───────────┐ ┌────────────┐   │
│  │ SessionMap │ │ StatsSheet │   │  ← Each piece is its own component
│  └───────────┘ └────────────┘   │
└─────────────────────────────────┘
```

### 0.2 What is React Native?

React Native lets you write React code that renders **native** iOS/Android views instead of HTML. You write `<View>` instead of `<div>`, `<Text>` instead of `<p>`, but the mental model is identical.

| Web (React)        | Mobile (React Native) |
|--------------------|-----------------------|
| `<div>`            | `<View>`              |
| `<p>`, `<span>`    | `<Text>`              |
| `<img>`            | `<Image>`             |
| `<button>`         | `<Pressable>`         |
| CSS files          | StyleSheet objects or NativeWind classes |

### 0.3 JSX

JSX is the syntax that lets you write HTML-like code inside JavaScript:

```tsx
// This is JSX — it looks like HTML but it's actually JavaScript
function Greeting() {
  const name = "Ahmed";
  return <Text>Hello, {name}!</Text>;  // {curly braces} = JavaScript expression
}
```

> **Key insight:** JSX is syntactic sugar. `<Text>Hello</Text>` compiles to `React.createElement(Text, null, "Hello")`. The angle brackets are just a nicer way to write function calls.

### 0.4 Props vs State

These are the two types of data in React:

| | Props | State |
|---|---|---|
| **What** | Data passed INTO a component from its parent | Data managed INSIDE a component |
| **Who controls it** | Parent component | The component itself |
| **Can it change?** | Not by the component receiving it | Yes, via `setState` / setter functions |
| **Example** | `<StatsSheet distanceMeters={500} />` | `const [steps, setSteps] = useState(0)` |

```tsx
// Props: StatsSheet RECEIVES data, it doesn't own it
function StatsSheet(props: { distanceMeters: number }) {
  return <Text>{props.distanceMeters} m</Text>;
}

// State: SessionScreen OWNS the data
function SessionScreen() {
  const [saving, setSaving] = useState(false);  // ← state lives here
  return <StatsSheet distanceMeters={500} />;    // ← props flow down
}
```

### 0.5 Hooks — The Core Six

Hooks are functions that let you "hook into" React features from function components. Every hook starts with `use`.

#### `useState` — Remember a value across renders

```tsx
const [count, setCount] = useState(0);
// count = current value (starts at 0)
// setCount = function to update it
// When you call setCount(1), React RE-RENDERS the component with count=1
```

> **Why it matters for GPS:** We use `useState` for everything visible on screen: `points`, `elapsedSec`, `steps`, `status`, `heading`.

#### `useRef` — Remember a value WITHOUT causing re-renders

```tsx
const startedAtRef = useRef<number | null>(null);
// startedAtRef.current = the stored value
// Changing .current does NOT trigger a re-render
```

> **Why it matters for GPS:** We use `useRef` for internal bookkeeping that the UI doesn't need to see: `startedAtRef` (when tracking started), `pausedAccumMsRef` (total paused time), `lastPointRef` (the last accepted GPS point for filtering). If these were `useState`, every GPS reading would cause an unnecessary screen redraw.

**Mental model:**
- `useState` = "I want the screen to update when this changes"
- `useRef` = "I want to remember this, but the screen doesn't need to know"

#### `useEffect` — Run code when things change

```tsx
useEffect(() => {
  // This code runs AFTER the component renders
  console.log("Status changed to:", status);

  return () => {
    // This CLEANUP code runs before the NEXT effect or when component unmounts
    console.log("Cleaning up previous effect");
  };
}, [status]); // ← Dependency array: only re-run when `status` changes
```

> **The dependency array is CRITICAL.** It tells React "only re-run this effect when these specific values change."
> - `[]` = run once on mount, never again
> - `[status]` = run whenever `status` changes
> - `[t.status, t]` = run whenever `t.status` OR `t` changes (⚠️ this caused an infinite loop bug — see [Phase 7](#phase-7--real-world-debugging-lessons))

#### `useCallback` — Memoize a function

```tsx
const start = useCallback(async () => {
  // ... tracking logic
}, [requestPermission, startTick]);
```

> **Why?** Without `useCallback`, a new function object is created every render. If that function is in a dependency array of another hook, it would trigger that hook every render. `useCallback` says "only create a new function when my dependencies change."

#### `useMemo` — Memoize a computed value

```tsx
const stats = useMemo(() => computeStats(points, elapsedSec), [points, elapsedSec]);
```

> **Why?** `computeStats` loops through every GPS point — expensive! `useMemo` caches the result and only recalculates when `points` or `elapsedSec` actually change.

#### `useNavigation` — Access the navigation object (React Navigation / Expo Router)

```tsx
const nav = useNavigation();
nav.addListener('beforeRemove', (e) => { /* intercept back button */ });
```

### 0.6 TypeScript Basics for This Project

TypeScript adds **types** to JavaScript. Think of types as labels that describe what shape data has:

```tsx
// An interface defines the shape of an object
interface TrackPoint {
  lat: number;         // Must be a number
  lng: number;
  speed: number | null; // Can be number OR null
  accuracy: number | null;
  segment: number;
}

// A type union restricts a value to specific strings
type TrackerStatus = 'idle' | 'requesting-permission' | 'tracking' | 'paused' | 'stopped';

// Generics: useState<TrackPoint[]> means "state that holds an array of TrackPoints"
const [points, setPoints] = useState<TrackPoint[]>([]);
```

> **Why bother?** TypeScript catches errors before your code even runs. If you try to access `point.speed.toFixed(1)` but speed can be `null`, TypeScript will warn you.

---

## Phase 1 — The Expo Ecosystem

### 1.1 What is Expo?

Expo is a **framework on top of React Native** that handles the hard parts (building native apps, managing native dependencies, providing a development server). Think of it as:

```
You write JavaScript/TypeScript
        ↓
   Expo compiles it
        ↓
Native iOS app    Native Android app
```

### 1.2 Expo Go vs Development Builds

This is one of the most important distinctions and the source of our biggest bug:

| | Expo Go | Development Build |
|---|---|---|
| **What** | A generic app from the App Store that runs your JS code | A custom app built specifically for YOUR project |
| **Install** | Download from App Store | Built via `eas build` and installed manually |
| **Native modules** | Only what's pre-bundled in Expo Go | Everything your `app.json` specifies |
| **Background tasks** | ❌ NOT supported | ✅ Supported |
| **Custom permissions** | ❌ Limited | ✅ Full control |

> **Why this matters:** Our app uses background GPS tracking (`startLocationUpdatesAsync`), which requires native `UIBackgroundModes` configuration. Expo Go doesn't have this → 100+ errors per second. We had to detect Expo Go and fall back to foreground-only tracking.

```tsx
// How we detect Expo Go at runtime
import Constants, { AppOwnership } from 'expo-constants';

const isExpoGo = Constants.appOwnership === AppOwnership.Expo;
// true  → running in Expo Go (limited)
// false → running in a development build or standalone app (full power)
```

### 1.3 File-Based Routing (Expo Router)

Expo Router maps **file paths** to **screen URLs**, just like a website:

```
app/
├── _layout.tsx          →  Root layout (wraps everything)
├── (tabs)/
│   ├── _layout.tsx      →  Tab bar layout
│   ├── index.tsx        →  Home tab (/)
│   └── activity.tsx     →  Activity tab (/activity)
├── session.tsx          →  /session (live tracking screen)
└── session/
    └── [id].tsx         →  /session/abc123 (past session detail)
```

> `[id].tsx` is a **dynamic route**. The brackets mean "this part of the URL is a variable." When you navigate to `/session/abc123`, `id` will be `"abc123"`.

### 1.4 `app.json` — Your App's Native Configuration

This file tells Expo what native features your app needs. It's compiled into the actual iOS `Info.plist` and Android `AndroidManifest.xml`.

```json
{
  "expo": {
    "plugins": [
      ["expo-location", {
        "locationWhenInUsePermission": "Trackotest uses your location..."
      }]
    ],
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["location"]
      }
    }
  }
}
```

> **Key concept:** Changing `app.json` doesn't take effect in Expo Go. It only matters when you create a development build or production app. This is why background tracking can't work in Expo Go.

### 1.5 Permissions on Mobile

Unlike the web, mobile apps must **explicitly ask the user** before accessing sensitive hardware. The flow:

```
App starts
    ↓
Check: "Do I already have permission?"
    ↓ No
Request permission → OS shows native dialog
    ↓
User taps "Allow" / "Deny"
    ↓
Result comes back to your code
    ↓ Denied?
Show a custom "Permission Required" screen
```

```tsx
// 1. Check current status
const current = await Location.getForegroundPermissionsAsync();

// 2. If not granted, request
if (current.status !== 'granted') {
  const result = await Location.requestForegroundPermissionsAsync();
  if (result.status !== 'granted') {
    // User denied — show PermissionGate component
  }
}

// 3. Optionally ask for background permission (separate dialog on iOS)
await Location.requestBackgroundPermissionsAsync();
```

> **iOS specificity:** iOS has TWO levels of location permission:
> 1. **When In Use** — app can access GPS only while it's on screen
> 2. **Always** — app can access GPS even when backgrounded
>
> Users must first grant "When In Use" before they can upgrade to "Always."

---

## Phase 2 — GPS & Location APIs

### 2.1 How GPS Actually Works

Your phone has a GPS chip that listens to signals from ~30 satellites orbiting Earth. By measuring signal timing from multiple satellites, it triangulates your position.

```
🛰️ Satellite 1: "I'm here, at time T1"
🛰️ Satellite 2: "I'm here, at time T2"
🛰️ Satellite 3: "I'm here, at time T3"
🛰️ Satellite 4: "I'm here, at time T4"
        ↓
📱 Phone computes intersection → (latitude, longitude, altitude)
```

**What you get from each GPS reading:**

```tsx
interface LocationObject {
  coords: {
    latitude: number;       // e.g., 30.0444 (Cairo)
    longitude: number;      // e.g., 31.2357
    altitude: number | null;
    accuracy: number | null; // How confident the GPS is (meters). Lower = better.
    speed: number | null;    // Meters per second. WARNING: iOS returns -1 when unknown!
    heading: number | null;  // Direction of travel (0-360 degrees, 0 = north)
  };
  timestamp: number;         // Unix timestamp in milliseconds
}
```

> **Accuracy matters:** Outdoors with clear sky → accuracy ~5m. Indoors → accuracy can be 50-100m or worse. Our filter rejects readings with accuracy > 20m.

> **Speed quirk on iOS:** When you're standing still or GPS can't determine speed, iOS returns `speed = -1` (not 0, not null). This caused our "-3.6 km/h" bug because `-1 × 3.6 = -3.6`.

### 2.2 Foreground vs Background Tracking

| | Foreground | Background |
|---|---|---|
| **When** | App is on screen | App is minimized or screen is off |
| **API** | `Location.watchPositionAsync(...)` | `Location.startLocationUpdatesAsync(...)` |
| **Works in Expo Go?** | ✅ Yes | ❌ No |
| **Requires** | Foreground permission | Background permission + native config |
| **Battery impact** | Medium | High |

**Foreground tracking** (what we use in Expo Go):

```tsx
const subscription = await Location.watchPositionAsync(
  {
    accuracy: Location.Accuracy.High,
    timeInterval: 1000,     // At most every 1 second
    distanceInterval: 0,    // Fire even if you haven't moved
  },
  (location) => {
    // Called every time GPS gets a new reading
    console.log(location.coords.latitude, location.coords.longitude);
  }
);

// Later, when you want to stop:
subscription.remove();
```

**Background tracking** (requires dev build):

```tsx
// Step 1: Define what happens when a location arrives (runs even when app is closed)
TaskManager.defineTask('my-location-task', ({ data, error }) => {
  if (error) return;
  const { locations } = data;
  // Process locations...
});

// Step 2: Start the background service
await Location.startLocationUpdatesAsync('my-location-task', {
  accuracy: Location.Accuracy.BestForNavigation,
  showsBackgroundLocationIndicator: true,   // iOS blue bar
  foregroundService: {                       // Android notification
    notificationTitle: 'Tracking...',
    notificationBody: 'Your route is being recorded.',
  },
});
```

### 2.3 The Observer Pattern (Pub/Sub)

Our location system uses the **Observer Pattern** — a design pattern where one piece of code "emits" events and multiple other pieces can "subscribe" to listen:

```
┌──────────────────┐
│   GPS Hardware    │  produces location readings
└────────┬─────────┘
         ↓ emit([location])
┌──────────────────┐
│   locationTask.ts │  receives readings, broadcasts to all listeners
└────────┬─────────┘
         ↓
┌──────────────────┐ ┌──────────────────┐
│ useLocationTracker│ │ (future listener)│  any code can subscribe
└──────────────────┘ └──────────────────┘
```

Here's how it works in [locationTask.ts](file:///c:/Users/ahmed/Downloads/one14-docs/trackotest3/lib/locationTask.ts):

```tsx
// A Set of listener functions — anyone can add themselves
const listeners = new Set<Listener>();

// Subscribe: add your function to the set
export function subscribeLocations(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };  // Return an "unsubscribe" function
}

// Emit: when GPS data arrives, call every listener
function emit(locs: Location.LocationObject[]) {
  listeners.forEach((fn) => {
    try { fn(locs); } catch {}  // try/catch so one broken listener doesn't break all
  });
}
```

> **Why not just pass locations directly?** Because the GPS data comes from two different sources (foreground `watchPositionAsync` or background `TaskManager`), but our hook shouldn't care which one is active. The observer pattern creates a single, consistent stream regardless of the source.

### 2.4 The Dual-Mode Strategy

Our [locationTask.ts](file:///c:/Users/ahmed/Downloads/one14-docs/trackotest3/lib/locationTask.ts) implements a smart fallback:

```
startBackgroundLocation() called
        ↓
Is this Expo Go?──────── YES ──→ Use watchPositionAsync (foreground)
        │                               ↓
        NO                        emit([location]) ──→ listeners
        ↓
Try startLocationUpdatesAsync (background)
        ↓
Success? ──── YES ──→ TaskManager receives data ──→ emit() ──→ listeners
        │
        NO (native module missing)
        ↓
Fallback: use watchPositionAsync (foreground)
        ↓
emit([location]) ──→ listeners
```

The hook (`useLocationTracker`) never knows or cares which mode is active. It just subscribes to `subscribeLocations()` and gets location data either way.

---

## Phase 3 — Geo Math (The Brain)

All geo math lives in [lib/geo.ts](file:///c:/Users/ahmed/Downloads/one14-docs/trackotest3/lib/geo.ts) — a **pure module** with zero dependencies on React, GPS APIs, or UI. This makes it easy to test.

### 3.1 The Haversine Formula — "How Far Apart Are Two Points on Earth?"

The Earth is a sphere (approximately). You can't just do `distance = sqrt((x2-x1)² + (y2-y1)²)` because latitude/longitude are coordinates on a curved surface, not a flat plane.

The **Haversine formula** computes the great-circle distance (shortest path along the surface of a sphere):

```
Given two points: (lat1, lng1) and (lat2, lng2)

1. Convert degrees to radians  (radians = degrees × π / 180)
2. Compute differences:  dLat = lat2 - lat1,  dLng = lng2 - lng1
3. a = sin²(dLat/2) + cos(lat1) × cos(lat2) × sin²(dLng/2)
4. distance = 2 × R × arcsin(√a)     where R = 6,371,000 meters (Earth's radius)
```

```tsx
// From lib/geo.ts
const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}
```

> **Quick reference:** 1 degree of latitude ≈ 111 km. So `0.00001` degrees ≈ 1.1 meters.

### 3.2 GPS Noise & Why We Filter Points

GPS is **noisy**. Even standing perfectly still, consecutive readings will report slightly different positions. This "jitter" looks like random teleportation:

```
Real position:     📍 (you're standing still)
GPS reading 1:     📍 + 3m north
GPS reading 2:     📍 + 5m east
GPS reading 3:     📍 + 2m south
GPS reading 4:     📍 + 4m west
```

Without filtering, your app would think you walked 14 meters while standing still!

### 3.3 The `acceptPoint` Filter

Every incoming GPS reading goes through `acceptPoint()`. Think of it as a bouncer at a club — it checks multiple criteria before letting a point in:

```tsx
export function acceptPoint(prev: TrackPoint | null, next: TrackPoint): boolean {
  // RULE 1: Reject inaccurate readings (> 20m uncertainty)
  if (next.accuracy != null && next.accuracy > ACCURACY_MAX_M) return false;

  // First point ever? Always accept it.
  if (prev === null) return true;

  // RULE 2: Reject if time hasn't advanced
  const dt = next.t - prev.t;
  if (dt < MIN_DT_MS) return false;

  // RULE 3: Reject if you haven't moved enough (jitter filter)
  const d = haversineMeters(prev, next);
  const uncertainty = Math.max(prev.accuracy ?? 0, next.accuracy ?? 0);
  if (d < Math.max(MIN_STEP_M, uncertainty * JITTER_ACCURACY_FACTOR)) return false;

  // RULE 4: Reject impossible speeds (GPS teleport glitches)
  if (dt > 100) {
    const mps = d / (dt / 1000);
    if (mps > MAX_SPEED_MPS) return false;  // > 108 km/h? Probably a glitch
  }

  return true;  // All checks passed — accept this point
}
```

**The filter thresholds and what they mean:**

| Constant | Value | Purpose |
|---|---|---|
| `ACCURACY_MAX_M` | 20m | Reject weak GPS signals (indoor, tunnels) |
| `MIN_STEP_M` | 3m | Ignore tiny movements (GPS jitter while standing still) |
| `MAX_SPEED_MPS` | 30 m/s | Reject teleport glitches (that's ~108 km/h) |
| `MIN_DT_MS` | 0ms | Don't reject based on time alone |
| `JITTER_ACCURACY_FACTOR` | 0.5 | Movement must exceed half the GPS uncertainty |

> **The jitter-accuracy trick (line 42):** If GPS accuracy is 10m, your reported position could be anywhere in a 10m radius. So a "movement" of 4m might just be noise. By requiring movement > `accuracy × 0.5`, we dynamically adapt the filter based on signal quality.

### 3.4 Computing Stats

`computeStats()` takes the array of accepted points and produces the numbers shown on screen:

```tsx
export function computeStats(points: TrackPoint[], durationSec: number): SessionStats {
  // Need at least 2 points to compute anything
  if (points.length < 2) {
    return { distanceMeters: 0, avgSpeedMps: 0, maxSpeedMps: 0, paceSecPerKm: null };
  }

  let distance = 0;
  let maxSpeed = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    // Don't bridge across pause gaps
    if (curr.segment !== prev.segment) continue;

    distance += haversineMeters(prev, curr);

    // Max speed: only trust GPS-reported speed (Doppler-based, more accurate)
    if (curr.speed != null && curr.speed >= 0 && curr.speed <= MAX_SPEED_MPS) {
      maxSpeed = Math.max(maxSpeed, curr.speed);
    }
  }

  // Average speed = total distance / total active time
  const avg = durationSec > 0 ? distance / durationSec : 0;

  // Pace = how many seconds it takes to cover 1 km
  const pace = distance > 0 ? durationSec / (distance / 1000) : null;

  return { distanceMeters: distance, avgSpeedMps: avg, maxSpeedMps: maxSpeed, paceSecPerKm: pace };
}
```

> **Why `segment` matters:** When you pause and resume a session, a new segment starts. Without segment checking, the distance between your "paused" position and your "resumed" position would be erroneously added. Imagine pausing, driving 2km to a park, then resuming — without segments, your walking distance would include that car ride.

---

## Phase 4 — The Tracker State Machine (The Heart)

The [useLocationTracker](file:///c:/Users/ahmed/Downloads/one14-docs/trackotest3/hooks/useLocationTracker.ts) hook is the core of the app. It manages the entire tracking lifecycle.

### 4.1 State Machine Concept

A **state machine** is a system that can be in exactly one "state" at any time, and transitions between states are explicitly defined:

```
idle ──→ requesting-permission ──→ permission-denied
                                ↘
                               ready ──→ tracking ⇄ paused
                                                 ↘
                                               stopped
```

We represent this as a TypeScript union type:

```tsx
export type TrackerStatus =
  | 'idle'                    // Initial state, nothing has happened yet
  | 'requesting-permission'   // Waiting for user to tap Allow/Deny
  | 'permission-denied'       // User denied, show PermissionGate
  | 'ready'                   // Permission granted, ready to track
  | 'tracking'                // Actively recording GPS data
  | 'paused'                  // Temporarily stopped recording
  | 'stopped';                // Session complete, ready to save
```

> **Why not booleans?** You might think `isTracking: boolean, isPaused: boolean`. But then what does `isTracking: true, isPaused: true` mean? It's an impossible state, but booleans allow it. A single string status makes impossible states impossible.

### 4.2 The Data Architecture

The hook manages two kinds of data:

**State (triggers re-renders):**
```tsx
const [status, setStatus] = useState<TrackerStatus>('idle');
const [points, setPoints] = useState<TrackPoint[]>([]);     // All accepted GPS points
const [elapsedSec, setElapsedSec] = useState(0);             // Active time in seconds
const [steps, setSteps] = useState(0);                        // Pedometer count
const [heading, setHeading] = useState<number | null>(null);  // Compass direction
const [initialPos, setInitialPos] = useState(null);           // First GPS fix for map centering
```

**Refs (no re-renders — internal bookkeeping):**
```tsx
const startedAtRef = useRef<number | null>(null);     // Date.now() when tracking began
const pausedAccumMsRef = useRef(0);                   // Total milliseconds spent paused
const pauseStartRef = useRef<number | null>(null);    // When the current pause began
const segmentRef = useRef(0);                         // Current segment number (increments on resume)
const lastPointRef = useRef<TrackPoint | null>(null);  // Last accepted point (for filtering)
const pausedRef = useRef(false);                      // Is tracking paused? (for fast checks in callbacks)
```

> **Why is `pausedRef` a ref AND `status` includes 'paused'?** Because `status` is React state — it's updated asynchronously and may be stale inside callbacks. `pausedRef.current` is always up-to-date because refs are mutable. The GPS callback checks `pausedRef.current` (immediate, always fresh) rather than `status` (might be one render behind).

### 4.3 The Timer

The elapsed time counter uses `setInterval`:

```tsx
const startTick = useCallback(() => {
  clearTick();
  tickRef.current = setInterval(() => {
    if (!startedAtRef.current) return;
    // Total elapsed = (now - start) - (total time spent paused)
    const raw = Date.now() - startedAtRef.current - pausedAccumMsRef.current;
    setElapsedSec(Math.max(0, Math.floor(raw / 1000)));
  }, 1000);  // Update every second
}, []);
```

**How pause time is tracked:**

```
Timeline:
0s ──────── 30s ────── 50s ──────── 80s ──── 100s
   tracking      paused       tracking      stopped

startedAt = 0s
pauseStart = 30s (when pause began)
pausedAccum = 20s (50s - 30s, added when resume is pressed)

At t=80s: elapsed = 80 - 0 - 20 = 60s ← correct! We tracked for 60 active seconds
```

### 4.4 The `start()` Flow

When the user taps "Start Session", here's exactly what happens:

```tsx
const start = useCallback(async () => {
  // 1. CHECK PERMISSIONS
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status !== 'granted') {
    const ok = await requestPermission();
    if (!ok) return;  // User denied → stop here
  }

  // 2. RESET ALL STATE
  startedAtRef.current = Date.now();
  pausedAccumMsRef.current = 0;
  segmentRef.current = 0;
  lastPointRef.current = null;
  pausedRef.current = false;
  setPoints([]);
  setElapsedSec(0);

  // 3. START UI IMMEDIATELY (don't wait for GPS fix)
  setStatus('tracking');
  startTick();

  // 4. GET INITIAL POSITION (non-blocking, for map centering)
  Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })
    .then((pos) => setInitialPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }))
    .catch(() => {});

  // 5. START GPS STREAMING
  await startBackgroundLocation();

  // 6. START COMPASS
  headingSubRef.current = await Location.watchHeadingAsync(/* ... */);

  // 7. START PEDOMETER
  await startPedometer();
}, [requestPermission, startTick, startPedometer]);
```

> **Critical lesson learned:** Step 3 was originally AFTER steps 4-7. That meant the timer wouldn't start for 10+ seconds while waiting for a GPS fix. Moving `setStatus('tracking')` and `startTick()` to the top fixed the lag. See [Phase 7](#71-the-11-second-lag).

### 4.5 The Location Subscription

This `useEffect` sets up a listener that processes every GPS reading:

```tsx
useEffect(() => {
  const unsub = subscribeLocations((locs) => {
    // Guard: ignore readings if not tracking or paused
    if (!startedAtRef.current || pausedRef.current) return;

    const accepted: TrackPoint[] = [];
    for (const loc of locs) {
      const next: TrackPoint = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        t: Date.now() - startedAtRef.current,  // Relative timestamp (ms since start)
        speed: /* cleaned GPS speed */,
        accuracy: loc.coords.accuracy ?? null,
        segment: segmentRef.current,
      };

      // Apply the filter — reject jitter, teleports, bad accuracy
      if (!acceptPoint(lastPointRef.current, next)) continue;

      lastPointRef.current = next;  // Update "last accepted" for next comparison
      accepted.push(next);
    }

    // Batch all accepted points into state in one update
    if (accepted.length) setPoints((prev) => [...prev, ...accepted]);
  });

  return unsub;  // Cleanup: unsubscribe when component unmounts
}, []);            // Empty deps: subscribe once, never re-subscribe
```

> **Why `setPoints((prev) => [...prev, ...accepted])` instead of `setPoints([...points, ...accepted])`?**
> Because `points` in the closure might be stale (captured from a previous render). The callback form `(prev) => ...` always receives the latest value. This is a common React pattern for state updates inside effects/callbacks.

### 4.6 Pause / Resume / Stop

```tsx
// PAUSE: freeze time, stop accepting points
const pause = useCallback(() => {
  pauseStartRef.current = Date.now();  // Remember when we paused
  pausedRef.current = true;            // Immediately stop accepting GPS data
  clearTick();                         // Stop the timer
  setStatus('paused');                 // Update UI
}, [status, steps]);

// RESUME: account for paused time, start new segment
const resume = useCallback(async () => {
  // Add the duration of this pause to total paused time
  pausedAccumMsRef.current += Date.now() - pauseStartRef.current;
  segmentRef.current += 1;      // Start a new polyline segment
  lastPointRef.current = null;  // Reset filter (first point in new segment always accepted)
  pausedRef.current = false;    // Resume accepting GPS data
  setStatus('tracking');
  startTick();
}, [status, startTick]);

// STOP: clean up everything
const stop = useCallback(() => {
  pausedRef.current = true;
  headingSubRef.current?.remove();   // Stop compass
  pedSubRef.current?.remove();       // Stop pedometer
  clearTick();                       // Stop timer
  void stopBackgroundLocation();     // Stop GPS
  setStatus('stopped');
}, [status]);
```

### 4.7 The Pedometer

The pedometer counts steps using your phone's motion sensors (accelerometer + motion coprocessor):

```tsx
const startPedometer = useCallback(async () => {
  try {
    await Pedometer.requestPermissionsAsync();
    const available = await Pedometer.isAvailableAsync();
    if (!available) return;

    pedBaselineRef.current = null;  // Will capture the first reading
    setSteps(0);

    pedSubRef.current = Pedometer.watchStepCount((res) => {
      if (pausedRef.current) return;  // Don't count steps while paused

      // The FIRST callback tells us the device's cumulative step count
      // We save it as our "zero point"
      if (pedBaselineRef.current == null) pedBaselineRef.current = res.steps;

      // Steps since our session started = current - baseline
      const sinceResume = Math.max(0, res.steps - pedBaselineRef.current);
      setSteps(pedAccumBeforeResumeRef.current + sinceResume);
    });
  } catch {}
}, []);
```

> **Why a "baseline"?** The pedometer reports cumulative steps since the subscription started. If the first callback reports `steps: 47`, that doesn't mean you took 47 steps — it means 47 steps were counted since the watch began. We save 47 as our baseline, so actual steps = `current - 47`.

---

## Phase 5 — Map & UI (The Face)

### 5.1 react-native-maps

[SessionMap.tsx](file:///c:/Users/ahmed/Downloads/one14-docs/trackotest3/components/session/SessionMap.tsx) wraps the native map SDK:

```tsx
<MapView
  style={StyleSheet.absoluteFill}                    // Fill entire screen
  provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}  // Google Maps on Android, Apple Maps on iOS
  customMapStyle={darkMapStyle}                       // Dark theme (Android only)
  showsUserLocation                                  // Blue pulsing dot
  showsMyLocationButton={false}                      // Hide the default button
  initialRegion={initialRegion}                      // Where to center on load
>
  {/* Route polyline */}
  <Polyline coordinates={coords} strokeColor="#4F46E5" strokeWidth={5} />

  {/* Start marker */}
  <Marker coordinate={startPoint} title="Start" pinColor="green" />
</MapView>
```

### 5.2 Polyline Segments

When the user pauses and resumes, we DON'T want a straight line from "pause location" to "resume location." The `segment` field in each point handles this:

```tsx
// Split points into groups by segment number
function splitSegments(points: TrackPoint[]): TrackPoint[][] {
  const segments: TrackPoint[][] = [];
  let current: TrackPoint[] = [];
  let segId = -1;
  for (const p of points) {
    if (p.segment !== segId) {
      if (current.length) segments.push(current);
      current = [p];
      segId = p.segment;
    } else {
      current.push(p);
    }
  }
  if (current.length) segments.push(current);
  return segments;
}

// Render each segment as a separate Polyline
{segments.map((seg, idx) => (
  <Polyline key={idx} coordinates={seg.map(p => ({ latitude: p.lat, longitude: p.lng }))} />
))}
```

```
Segment 0:  🟢──────────⏸  (pause)
                              (gap — no line drawn)
Segment 1:              ▶───────────🔴  (resume → stop)
```

### 5.3 Camera Following

While tracking, the map should follow your position:

```tsx
useEffect(() => {
  if (!follow || points.length === 0) return;
  const last = points[points.length - 1];
  mapRef.current.animateCamera({
    center: { latitude: last.lat, longitude: last.lng },
    zoom: 17,          // Street-level zoom
    heading: heading,  // Rotate map to face your direction of travel
  }, { duration: 500 });  // Smooth 500ms animation
}, [follow, points, heading]);
```

### 5.4 The Bottom Sheet (StatsSheet)

[@gorhom/bottom-sheet](https://github.com/gorhom/react-native-bottom-sheet) provides the Uber-style draggable panel:

```tsx
<BottomSheet
  snapPoints={['15%', '50%', '88%']}  // Three heights the sheet can snap to
  index={1}                             // Start at 50%
>
  <BottomSheetView>
    {/* Stats: Distance, Time, Speed */}
    {/* Buttons: Pause/Resume, Stop */}
  </BottomSheetView>
</BottomSheet>
```

```
┌──────────────────────┐
│       MAP             │   88% ──→ Full stats + future features
│                       │
├──────────────────────┤
│  Distance  Time Speed │   50% ──→ Main stats + controls (default)
│  Avg  Max  Pace Steps │
│  [Pause]     [Stop]   │
├──────────────────────┤   15% ──→ Peek (quick glance)
│  Distance  Time Speed │
└──────────────────────┘
```

### 5.5 Formatting Numbers for Display

[lib/format.ts](file:///c:/Users/ahmed/Downloads/one14-docs/trackotest3/lib/format.ts) converts raw SI values to human-readable strings:

```tsx
formatDistance(1500)     → "1.50 km"    // meters → km when > 1000
formatDistance(450)      → "450 m"      // stays in meters when < 1000
formatDuration(3725)     → "01:02:05"   // seconds → HH:MM:SS
formatSpeed(10)          → "36.0 km/h"  // m/s × 3.6 = km/h
formatPace(300)          → "5:00 /km"   // seconds-per-km → mm:ss per km
formatPace(null)         → "--:--"      // Not enough data yet
```

> **Why store in SI, display in human units?** Because math is easier in meters and seconds. You never want to do calculations in "km/h" — it's error-prone. Convert only at the display layer.

---

## Phase 6 — Persistence with Firebase

### 6.1 What is Firestore?

Firestore is a **NoSQL cloud database** by Google. Data is organized as:

```
Firestore
└── Collection: "sessions"          ← like a folder of documents
    ├── Document: "abc123"          ← like a JSON file
    │   ├── userId: null
    │   ├── startedAt: Timestamp
    │   ├── distanceMeters: 2540
    │   ├── points: [{lat, lng, t, speed, ...}, ...]
    │   └── ...
    ├── Document: "def456"
    └── Document: "ghi789"
```

### 6.2 The Sessions API

[lib/sessions.ts](file:///c:/Users/ahmed/Downloads/one14-docs/trackotest3/lib/sessions.ts) encapsulates all Firestore operations:

```tsx
// CREATE — save a completed session
const id = await saveSession({
  userId: null,
  startedAt: new Date(),
  endedAt: new Date(),
  durationSec: 1800,
  distanceMeters: 5000,
  points: [...],
});

// READ — list all sessions
const sessions = await listSessions(null, { limit: 50 });

// READ — get one session
const session = await getSession("abc123");

// DELETE
await deleteSession("abc123");
```

> **Why wrap Firestore in our own module?** If we later switch to a different database, or need to add caching, or chunk large sessions into sub-documents, we only change `sessions.ts`. Every screen that uses sessions doesn't need to change.

### 6.3 Crash Safety (Pending Session)

What if the app crashes after the user hits "Stop" but before Firestore saves?

[lib/pendingSession.ts](file:///c:/Users/ahmed/Downloads/one14-docs/trackotest3/lib/pendingSession.ts) solves this with **AsyncStorage** (local on-device storage):

```
User hits Stop
    ↓
1. savePending(sessionData)    ← Save to local storage FIRST
    ↓
2. saveSession(sessionData)    ← Then save to Firestore
    ↓
3. clearPending()              ← Succeeded? Remove local copy
```

If step 2 fails (network error, crash), the pending session survives on device. Next time the app opens, it can retry.

---

## Phase 7 — Real-World Debugging Lessons

These are the actual bugs we encountered and fixed. Each one teaches a broader React Native concept.

### 7.1 The 11-Second Lag

**Symptom:** Opening the session screen, the timer wouldn't start for ~11 seconds.

**Root cause:** The `start()` function did this:

```tsx
// ❌ BEFORE: Blocking call BEFORE starting UI
const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
// ^^^ This takes 10+ seconds indoors to get a high-accuracy GPS fix!
setStatus('tracking');  // UI only starts here
startTick();
```

**Fix:** Start the UI immediately, fetch position in background:

```tsx
// ✅ AFTER: Start UI first, fetch position without blocking
setStatus('tracking');
startTick();

// Non-blocking: don't await this
Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })
  .then((pos) => setInitialPos(pos))
  .catch(() => {});
```

> **Lesson:** Never `await` slow operations before showing UI. Use `.then()` or fire-and-forget for non-critical async work.

### 7.2 The Infinite Permission Loop

**Symptom:** Permission dialog appeared, disappeared, reappeared — hundreds of times per second.

**Root cause:**
```tsx
useEffect(() => {
  if (t.status === 'idle') {
    t.start();
  }
}, [t.status, t]);  // ❌ `t` is a new object every render!
```

`useLocationTracker()` returns a new object every render. Including `t` in the dependency array means the effect fires every render → `t.start()` changes state → re-render → new `t` → effect fires again → ∞ loop.

**Fix:**
```tsx
useEffect(() => {
  if (t.status === 'idle') {
    t.start();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [t.status]);  // ✅ Only depend on the primitive string, not the object
```

> **Lesson:** Never put an **object** in a dependency array unless you're sure its reference is stable (via `useMemo`). Primitive values (strings, numbers, booleans) are safe because `'idle' === 'idle'` is true, but `{} === {}` is always false.

### 7.3 Speed Showing -3.6 km/h

**Symptom:** Speed showed "-3.6 km/h" when standing still.

**Root cause:** iOS returns `speed = -1` m/s when it can't determine speed. Our formatter blindly did `-1 × 3.6 = -3.6`.

**Fix:** Clamp negative speeds to 0:
```tsx
export function formatSpeed(mps: number): string {
  const clamped = Math.max(0, mps);  // Never display negative speed
  return `${(clamped * 3.6).toFixed(1)} km/h`;
}
```

> **Lesson:** Always check what values a platform API actually returns. Read the docs for edge cases (null, negative, NaN). iOS and Android often differ.

### 7.4 Distance Always 0

**Symptom:** Walking around, distance stayed at 0.

**Root cause:** `watchPositionAsync` had `distanceInterval: 3` — it only fires after you move 3 meters. Indoors with poor GPS, you might never trigger it. Additionally, when points DID arrive close together, dividing distance by near-zero time produced `Infinity` speed → rejected by the speed filter.

**Fix:** Set `distanceInterval: 0` (fire on every reading), and skip the speed check when time delta is under 100ms:

```tsx
if (dt > 100) {  // Only check speed when we have enough time resolution
  const mps = d / (dt / 1000);
  if (mps > MAX_SPEED_MPS) return false;
}
```

> **Lesson:** Division by zero (or near-zero) is a classic source of bugs. Always guard divisions, especially with sensor data where timing is unpredictable.

### 7.5 Steps Jumping from 0 to 9

**Symptom:** Step counter showed 0 for a while, then suddenly jumped to 9.

**Root cause:** The pedometer baseline was set to `res.steps - 1` instead of `res.steps`. Combined with iOS batching pedometer callbacks, the first callback might arrive with several accumulated steps, and the off-by-one baseline made the jump larger.

**Fix:** `pedBaselineRef.current = res.steps` (not `- 1`).

> **Lesson:** When working with cumulative sensor values, always capture the exact first value as your zero point. Don't try to be clever with ±1 adjustments.

### 7.6 The 100+ Native Error Spam

**Symptom:** Opening the app in Expo Go immediately produced hundreds of red error messages per second.

**Root cause:** `startLocationUpdatesAsync` requires native `UIBackgroundModes` configuration that only exists in development/production builds. Expo Go is a generic container without this configuration. Each failed call threw an error, and retry logic kept calling it.

**Fix:** Detect Expo Go and use a different API:

```tsx
const isExpoGo = Constants.appOwnership === AppOwnership.Expo;

if (isExpoGo) {
  // Use foreground-only tracking (works in Expo Go)
  await Location.watchPositionAsync(/* ... */);
} else {
  // Use background tracking (requires dev build)
  await Location.startLocationUpdatesAsync(/* ... */);
}
```

> **Lesson:** Always have a fallback strategy for features that require native configuration. Test in the most restrictive environment first (Expo Go), then add native features for production builds.

---

## Summary: The Architecture at a Glance

```
┌─────────────────────────────────────────────────┐
│                  app/session.tsx                  │  Screen (composition root)
│  ┌─────────────────────────────────────────────┐ │
│  │         useLocationTracker() hook            │ │  Brain (state machine)
│  │  ┌──────────┐  ┌──────────┐  ┌───────────┐  │ │
│  │  │ geo.ts   │  │ location │  │ Pedometer │  │ │  Math, GPS, Sensors
│  │  │ (math)   │  │ Task.ts  │  │           │  │ │
│  │  └──────────┘  └──────────┘  └───────────┘  │ │
│  └─────────────────────────────────────────────┘ │
│  ┌──────────────┐  ┌───────────────────────────┐ │
│  │  SessionMap   │  │       StatsSheet          │ │  UI (presentation)
│  │  (map + line) │  │  (bottom sheet + buttons) │ │
│  └──────────────┘  └───────────────────────────┘ │
│  ┌─────────────────────────────────────────────┐ │
│  │           sessions.ts + firebase.ts          │ │  Persistence
│  │           pendingSession.ts                  │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Key design principles:**
1. **Separation of concerns** — Math, GPS, UI, and persistence are in separate files
2. **Presentation vs logic** — `StatsSheet` receives numbers and callbacks; it has zero tracking logic
3. **Observable stream** — Location events flow through a pub/sub system, decoupling GPS from UI
4. **Graceful degradation** — The app works in Expo Go (limited) and dev builds (full power)
5. **Filter before store** — GPS noise is rejected before it enters the points array
