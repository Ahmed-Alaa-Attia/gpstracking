# GPS Tracking Session — Design Spec

**Date:** 2026-04-21
**Status:** Draft, pre-implementation
**Scope:** v1 of live GPS tracking feature (foreground-only) with map, route drawing, live stats, and Firestore persistence.

## 1. Goals

Build a tracking session feature so the user can:

- Start a session from the Home screen.
- See a full-screen map with a live-drawn polyline of their route.
- See live distance, duration, current speed, avg speed, max speed, and pace in a draggable bottom sheet.
- Pause, resume, and stop the session.
- Have completed sessions saved to Firestore and listed in the Activity tab.

Out of scope for v1 (explicitly deferred):

- Background tracking (requires dev build + background permission). Phase 2.
- Firebase Auth. Sessions are saved with `userId: null` for now; schema already supports it.
- Activity type selector. Schema has an optional `type` field; UI ships as generic sessions.
- Elevation gain, per-km splits, session log events in the full sheet.
- Session list thumbnails (can be added post-v1).

## 2. Platform + Tech Decisions

| Decision | Choice | Reason |
|---|---|---|
| Platforms | iOS + Android only (web ignored / fallback) | Unlocks native maps + real GPS APIs |
| Map lib | `react-native-maps` | Mature, out-of-box, Apple Maps iOS / Google Maps Android |
| Map polish | Custom dark Google Maps style JSON on Android; glow polyline on both | Matches "Track Live" neon aesthetic without Mapbox overhead |
| Location | `expo-location` `watchPositionAsync` | Foreground-only in v1, Expo Go compatible |
| Bottom sheet | `@gorhom/bottom-sheet` | Uber-style snap points; works with existing `reanimated` + `gesture-handler` |
| Persistence | Firebase Firestore (JS SDK) | Auth coming next, so no migration later |
| Local cache | `@react-native-async-storage/async-storage` | Firebase auth persistence + "pending session" safety slot |

## 3. Architecture

Runtime flow: Home → `/session` → permission gate (first time) → map + live tracking → pause/resume/stop → Firestore save → back to Home. Activity tab reads the new doc.

Module boundaries (each small, isolated, testable):

| Module | Responsibility | Public surface |
|---|---|---|
| `hooks/useLocationTracker.ts` | State machine, GPS subscription, route points, pause/resume, stats aggregation | `{ status, points, distance, duration, currentSpeed, avgSpeed, maxSpeed, pace, start, pause, resume, stop }` |
| `lib/geo.ts` | Pure geo math | `haversineMeters(a, b)`, `acceptPoint(prev, next, thresholds)`, `computeStats(points, durationSec)` |
| `lib/firebase.ts` | Firebase init singleton | `app`, `db` |
| `lib/sessions.ts` | The only caller into Firestore for sessions | `saveSession(s)`, `listSessions(userId, opts)`, `getSession(id)`, `deleteSession(id)` |
| `components/session/SessionMap.tsx` | MapView + polyline + custom style | Props: `points`, `following`, `onRecenterConsumed` |
| `components/session/StatsSheet.tsx` | Bottom sheet UI (presentation only) | Props: stats + callbacks |
| `app/session.tsx` | Composition root, no tracking logic | — |
| `app/session/[id].tsx` | Past-session detail view | — |

Tracking logic is all inside `useLocationTracker`; UI components receive values and callbacks. This means the screen can be rewritten without touching tracking, and tracking can be unit-tested via `lib/geo.ts`.

## 4. Data Model

### Firestore collection: `sessions`

```ts
interface SessionDoc {
  id: string;                 // Firestore doc id
  userId: string | null;      // null until Auth ships; required after
  type?: 'run' | 'bike' | 'drive' | 'generic';  // optional; default 'generic'
  startedAt: Timestamp;
  endedAt: Timestamp;
  durationSec: number;        // excludes paused time
  distanceMeters: number;
  avgSpeedMps: number;
  maxSpeedMps: number;
  paceSecPerKm: number | null;  // null if distance < 50m
  points: Array<{
    lat: number;
    lng: number;
    t: number;                // ms since startedAt (relative)
    speed: number | null;     // m/s
    accuracy: number | null;  // meters
    segment: number;          // increments on each Resume; used to break polyline
  }>;
  createdAt: Timestamp;       // serverTimestamp
  schemaVersion: 1;
}
```

Notes:

- Units stored in SI. UI formats to km, km/h, mm:ss.
- `points[]` inline is fine up to ~1–2 hour sessions. If sessions risk overflowing the 1 MiB doc limit, v2 splits into `sessions/{id}/chunks/{n}` behind the same `sessions.ts` API.
- `t` as relative ms (not absolute per-point timestamps) halves doc size.
- `segment` increments on each Resume; the polyline renders as multiple `Polyline` components, one per segment, so paused gaps are not bridged with a straight line.
- `userId: null` in v1; Firestore rules activate when Auth ships.

### Firestore rules (activate with Auth)

```
match /sessions/{id} {
  allow read, delete: if request.auth != null && resource.data.userId == request.auth.uid;
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
  allow update: if false;  // immutable once saved
}
```

## 5. Tracking Logic

### State machine

```
idle → requesting-permission → permission-denied
                             ↘ ready → tracking ⇄ paused → stopped → idle
```

Explicit string status (not booleans). All transitions go through `useLocationTracker` actions.

### GPS subscription config

```ts
Location.watchPositionAsync({
  accuracy: Location.Accuracy.BestForNavigation,
  timeInterval: 1000,
  distanceInterval: 3,
}, onPoint)
```

`BestForNavigation` is battery-heavy but gives sub-5m accuracy and a real `speed` field. Exposed as a const for easy tuning.

### Point acceptance filter (`lib/geo.ts::acceptPoint`)

A new reading is appended only if all hold:

1. `accuracy != null && accuracy <= 30` meters.
2. Distance from previous accepted point ≥ 2 meters.
3. Implied speed from previous point ≤ 60 m/s (~216 km/h).
4. Time delta from previous point ≥ 500 ms.

Rejected points are dropped silently (not stored, not counted).

### Derived stats

- `distance`: Haversine accumulated over consecutive accepted points within the same segment.
- `duration`: elapsed wall time minus sum of paused intervals. `setInterval(1000)` drives the UI tick while tracking; stopped on pause.
- `currentSpeed`: prefer `point.speed` from GPS; fall back to `haversine(prev, curr) / dt`.
- `avgSpeed`: `distance / duration`.
- `maxSpeed`: rolling max of `currentSpeed`, capped at 60 m/s.
- `pace`: `duration / (distance/1000)` when distance ≥ 50 m, else `null`.

### Pause / Resume / Stop

- **Pause:** stop appending points, freeze duration counter.
- **Resume:** increment `currentSegment`. Next accepted point starts a new polyline segment.
- **Stop:** unsubscribe, compute final stats, call `saveSession`. On success → back to Home. On failure → toast + retry; session stays in memory + a "pending session" slot in AsyncStorage protects against crash loss.

### Lifecycle

- `AppState` listener: if the app backgrounds during `tracking`, auto-pause and show a snackbar on return ("Tracking paused while app was backgrounded"). User must hit Resume manually.
- Hardware back / gesture back during an active session: intercepted via `usePreventRemove` / nav guard → modal asking "Stop and save?" / "Discard" / "Cancel". No silent data loss.

## 6. UI

### Home screen

Unchanged. Existing "Start Session" button already routes to `/session`.

### `app/session.tsx`

Full-screen map with a translucent top bar (back + lock toggle) and a draggable bottom sheet.

- **Snap points:** `['15%', '50%', '88%']`.
- **15% peek row:** distance · duration · current speed.
- **50% mid:** Pause/Resume + Stop buttons, avg speed, max speed, pace, GPS signal indicator.
- **88% full:** reserved for future session-log events (stub acceptable in v1).
- **Recenter pill** floats above the sheet; appears when user pans the map off-follow.
- **Map:** `SessionMap` component. Dark style JSON on Android. Polyline uses `colors.primary` with a wider semi-transparent stroke underneath for glow. Multi-segment rendering when session has been paused and resumed.

### Permission gate

Full-screen card matching Home aesthetic. Title "Location Required", body copy, primary Button "Grant Access". On `canAskAgain === false`, button becomes "Open Settings" and calls `Linking.openSettings()`. On `AppState` returning to active, re-check permission.

### Save-failure handling

Toast + retry button. Session remains in memory and in the AsyncStorage pending slot until saved or explicitly discarded.

### Activity tab (`app/(tabs)/activity.tsx`)

List sessions ordered by `startedAt desc`. Row: type icon, date, distance, duration. (Thumbnail deferred.) Tap row → `app/session/[id].tsx` detail screen: full map with route + stat grid reusing `StatCard`. Swipe-to-delete or delete button in detail screen.

### Visual reuse

Existing theme (`colors.primary`, `surface`, `surface-container-high`), `StatCard`, `Button`, `GridBackground` (permission gate background), existing typography classes.

## 7. Flows

1. **Happy path.** Home → Start Session → (first-time) permission prompt → map centers → Pause/Resume as needed → Stop → "Saving…" → Home. Session appears at top of Activity.
2. **Permission denied.** Permission gate view. Grant → OS dialog or Settings. `AppState` active → re-check → transition to `ready`.
3. **App backgrounded mid-session.** Auto-pause. On return, snackbar + user hits Resume manually.
4. **Hardware back mid-session.** Modal: Stop and save / Discard / Cancel.
5. **Save failure.** Toast + retry. Pending session preserved in AsyncStorage.

## 8. Dependencies to add

- `expo-location`
- `react-native-maps`
- `@gorhom/bottom-sheet`
- `firebase`
- `@react-native-async-storage/async-storage`

## 9. Configuration

- `app.json` / `app.config`: add `expo-location` plugin with foreground usage string; add iOS `NSLocationWhenInUseUsageDescription`; add Android `ACCESS_FINE_LOCATION`.
- Firebase config in `lib/firebase.ts` via Expo env vars (`EXPO_PUBLIC_FIREBASE_*`).
- Google Maps Android API key configured via `react-native-maps` instructions (requires Expo dev build; a config flag documents the fallback if running in Expo Go without a key — default Apple Maps iOS works out of the box; Android requires the key or the map view will be blank).

## 10. Testing

- Unit tests for `lib/geo.ts`: haversine accuracy, `acceptPoint` filter behaviors (accuracy cutoff, jitter rejection, teleport rejection, duplicate-time rejection), `computeStats` over fixtures.
- Manual QA matrix: cold start permission flow, deny-then-retry, pause/resume segment break, background auto-pause, hardware back interception, save failure retry, session saved and visible in Activity.

## 11. Phase 2 (not in this spec)

- Background tracking (`expo-task-manager` + `Location.startLocationUpdatesAsync`, dev build required).
- Firebase Auth + rules activation.
- Activity type selector UI.
- Elevation / per-km splits / session-log events.
- Session row thumbnails.
