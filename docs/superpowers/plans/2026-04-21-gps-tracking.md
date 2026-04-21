# GPS Tracking Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship foreground-only GPS tracking — start a session from Home, live map + polyline, Uber-style draggable stats sheet (distance / duration / speeds / pace), pause/resume/stop, and Firestore persistence surfaced in the Activity tab.

**Architecture:** `app/session.tsx` composes three isolated units — a `useLocationTracker` hook (state machine + GPS subscription + stats), a `SessionMap` component (react-native-maps + polyline + dark style), and a `StatsSheet` component (`@gorhom/bottom-sheet`). All geo math lives in a pure `lib/geo.ts` module that is unit-tested. Firestore I/O is hidden behind `lib/sessions.ts` so the auth migration and future chunked-point refactor don't ripple through the UI.

**Tech Stack:** Expo 54 / React Native 0.81, Expo Router v6, NativeWind v5, `expo-location`, `react-native-maps`, `@gorhom/bottom-sheet` v5, Firebase v10 Firestore (JS SDK), `@react-native-async-storage/async-storage`, `jest-expo` for unit tests.

**Spec:** [`docs/superpowers/specs/2026-04-21-gps-tracking-design.md`](../specs/2026-04-21-gps-tracking-design.md)

---

## File Structure

Created:

- `lib/geo.ts` — pure geo math (haversine, point acceptance, stat aggregation).
- `lib/firebase.ts` — Firebase init singleton.
- `lib/sessions.ts` — Firestore CRUD for sessions.
- `lib/pendingSession.ts` — AsyncStorage slot for crash-safety of unsaved sessions.
- `hooks/useLocationTracker.ts` — tracking state machine + GPS subscription.
- `components/session/SessionMap.tsx` — MapView wrapper with polyline + dark style.
- `components/session/StatsSheet.tsx` — bottom sheet UI (presentational).
- `components/session/PermissionGate.tsx` — permission-denied view.
- `components/session/darkMapStyle.ts` — Google Maps style JSON.
- `app/session/[id].tsx` — past-session detail screen.
- `__tests__/geo.test.ts` — unit tests for `lib/geo.ts`.
- `jest.config.js` — jest-expo config.
- `.env` (gitignored) — Firebase config env vars.

Modified:

- `app.json` — add `expo-location` plugin + iOS usage string + Android permission.
- `app/_layout.tsx` — wrap root with `GestureHandlerRootView` + `BottomSheetModalProvider`.
- `app/session.tsx` — replace stub with the composition root.
- `app/(tabs)/activity.tsx` — replace with sessions list.
- `package.json` — new dependencies.
- `.gitignore` — add `.env`.

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime deps**

Run (Expo-aware install picks SDK-compatible versions):

```bash
npx expo install expo-location react-native-maps @react-native-async-storage/async-storage
npm install @gorhom/bottom-sheet firebase
```

- [ ] **Step 2: Install dev deps for unit testing**

```bash
npm install --save-dev jest jest-expo @types/jest
```

- [ ] **Step 3: Verify install**

Run: `npx expo-doctor`
Expected: no errors about version mismatches. Warnings about missing scripts are fine.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add gps tracking dependencies"
```

---

## Task 2: Configure Expo plugins + permissions

**Files:**
- Modify: `app.json`
- Modify: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Update `app.json`**

Replace the `plugins` array and add platform permission strings:

```json
{
  "expo": {
    "name": "trackotest3",
    "slug": "trackotest3",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "trackotest3",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Trackotest uses your location to record your route, distance, and speed during a tracking session."
      }
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false,
      "permissions": ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"]
    },
    "web": {
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff",
          "dark": { "backgroundColor": "#000000" }
        }
      ],
      [
        "expo-location",
        {
          "locationWhenInUsePermission": "Trackotest uses your location to record your route, distance, and speed during a tracking session."
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    }
  }
}
```

- [ ] **Step 2: Create `.env.example`**

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

- [ ] **Step 3: Append to `.gitignore`**

Append these lines at the end:

```
# Local env
.env
.env.local
```

- [ ] **Step 4: Commit**

```bash
git add app.json .env.example .gitignore
git commit -m "chore: configure expo-location plugin and env template"
```

---

## Task 3: Set up jest-expo for unit tests

**Files:**
- Create: `jest.config.js`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Create `jest.config.js`**

```js
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@gorhom/.*|firebase|@firebase/.*)/)',
  ],
};
```

- [ ] **Step 2: Add `test` script to `package.json`**

Under `"scripts"`, add:

```json
"test": "jest"
```

- [ ] **Step 3: Verify jest runs**

Run: `npm test -- --passWithNoTests`
Expected: exits 0 with "No tests found" style output.

- [ ] **Step 4: Commit**

```bash
git add jest.config.js package.json
git commit -m "chore: configure jest-expo"
```

---

## Task 4: Implement `lib/geo.ts` — types and haversine (TDD)

**Files:**
- Create: `lib/geo.ts`
- Create: `__tests__/geo.test.ts`

- [ ] **Step 1: Write failing test for `haversineMeters`**

Create `__tests__/geo.test.ts`:

```ts
import { haversineMeters } from '@/lib/geo';

describe('haversineMeters', () => {
  it('returns 0 for identical points', () => {
    const p = { lat: 40.0, lng: -73.0 };
    expect(haversineMeters(p, p)).toBe(0);
  });

  it('computes ~111km for 1 degree latitude near equator', () => {
    const a = { lat: 0, lng: 0 };
    const b = { lat: 1, lng: 0 };
    expect(haversineMeters(a, b)).toBeGreaterThan(110_000);
    expect(haversineMeters(a, b)).toBeLessThan(112_000);
  });

  it('computes short distances within 1m tolerance', () => {
    const a = { lat: 40.0, lng: -73.0 };
    const b = { lat: 40.00009, lng: -73.0 }; // ~10m north
    expect(haversineMeters(a, b)).toBeGreaterThan(9);
    expect(haversineMeters(a, b)).toBeLessThan(11);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `npm test -- geo`
Expected: FAIL — "Cannot find module '@/lib/geo'".

- [ ] **Step 3: Implement `lib/geo.ts`**

```ts
export interface LatLng {
  lat: number;
  lng: number;
}

export interface TrackPoint extends LatLng {
  t: number;
  speed: number | null;
  accuracy: number | null;
  segment: number;
}

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

- [ ] **Step 4: Run test to confirm it passes**

Run: `npm test -- geo`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/geo.ts __tests__/geo.test.ts
git commit -m "feat(geo): add haversineMeters"
```

---

## Task 5: Implement `acceptPoint` filter (TDD)

**Files:**
- Modify: `lib/geo.ts`
- Modify: `__tests__/geo.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `__tests__/geo.test.ts`:

```ts
import { acceptPoint } from '@/lib/geo';

const basePrev = { lat: 40, lng: -73, t: 0, speed: 0, accuracy: 5, segment: 0 };

describe('acceptPoint', () => {
  it('rejects first point with bad accuracy', () => {
    const next = { lat: 40, lng: -73, t: 0, speed: null, accuracy: 50, segment: 0 };
    expect(acceptPoint(null, next)).toBe(false);
  });

  it('accepts first point with good accuracy', () => {
    const next = { lat: 40, lng: -73, t: 0, speed: null, accuracy: 10, segment: 0 };
    expect(acceptPoint(null, next)).toBe(true);
  });

  it('rejects sub-2m jitter', () => {
    const next = { ...basePrev, lat: 40.000005, t: 1000 }; // ~0.5m
    expect(acceptPoint(basePrev, next)).toBe(false);
  });

  it('rejects teleport exceeding 60 m/s', () => {
    const next = { ...basePrev, lat: 40.01, t: 1000, accuracy: 5 }; // ~1.1km in 1s
    expect(acceptPoint(basePrev, next)).toBe(false);
  });

  it('rejects duplicate/near-duplicate timestamps', () => {
    const next = { ...basePrev, lat: 40.0001, t: 100, accuracy: 5 };
    expect(acceptPoint(basePrev, next)).toBe(false);
  });

  it('accepts a normal walking step', () => {
    const next = { ...basePrev, lat: 40.00009, t: 5000, accuracy: 5 }; // ~10m in 5s
    expect(acceptPoint(basePrev, next)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — expect compile/import failure**

Run: `npm test -- geo`
Expected: FAIL — `acceptPoint` not exported.

- [ ] **Step 3: Add `acceptPoint` to `lib/geo.ts`**

Append:

```ts
export const ACCURACY_MAX_M = 30;
export const MIN_STEP_M = 2;
export const MAX_SPEED_MPS = 60;
export const MIN_DT_MS = 500;

export function acceptPoint(prev: TrackPoint | null, next: TrackPoint): boolean {
  if (next.accuracy == null || next.accuracy > ACCURACY_MAX_M) return false;
  if (prev === null) return true;
  const dt = next.t - prev.t;
  if (dt < MIN_DT_MS) return false;
  const d = haversineMeters(prev, next);
  if (d < MIN_STEP_M) return false;
  const mps = d / (dt / 1000);
  if (mps > MAX_SPEED_MPS) return false;
  return true;
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npm test -- geo`
Expected: PASS (all prior + 6 new).

- [ ] **Step 5: Commit**

```bash
git add lib/geo.ts __tests__/geo.test.ts
git commit -m "feat(geo): add acceptPoint filter"
```

---

## Task 6: Implement `computeStats` (TDD)

**Files:**
- Modify: `lib/geo.ts`
- Modify: `__tests__/geo.test.ts`

- [ ] **Step 1: Add failing tests**

Append:

```ts
import { computeStats } from '@/lib/geo';

describe('computeStats', () => {
  it('returns zeros for empty points', () => {
    expect(computeStats([], 0)).toEqual({
      distanceMeters: 0,
      avgSpeedMps: 0,
      maxSpeedMps: 0,
      paceSecPerKm: null,
    });
  });

  it('does not bridge across segment boundaries', () => {
    const pts = [
      { lat: 40, lng: -73, t: 0, speed: 1, accuracy: 5, segment: 0 },
      { lat: 40.00009, lng: -73, t: 10_000, speed: 1, accuracy: 5, segment: 0 }, // ~10m in segment 0
      { lat: 41, lng: -73, t: 20_000, speed: 1, accuracy: 5, segment: 1 }, // far jump, new segment
      { lat: 41.00009, lng: -73, t: 30_000, speed: 1, accuracy: 5, segment: 1 }, // ~10m in segment 1
    ];
    const s = computeStats(pts, 30);
    expect(s.distanceMeters).toBeGreaterThan(18);
    expect(s.distanceMeters).toBeLessThan(22);
  });

  it('returns null pace when distance < 50m', () => {
    const pts = [
      { lat: 40, lng: -73, t: 0, speed: 0, accuracy: 5, segment: 0 },
      { lat: 40.00009, lng: -73, t: 5_000, speed: 0, accuracy: 5, segment: 0 },
    ];
    expect(computeStats(pts, 5).paceSecPerKm).toBeNull();
  });

  it('caps maxSpeed at 60 m/s', () => {
    const pts = [
      { lat: 40, lng: -73, t: 0, speed: 100, accuracy: 5, segment: 0 },
      { lat: 40.001, lng: -73, t: 5_000, speed: 100, accuracy: 5, segment: 0 },
    ];
    expect(computeStats(pts, 5).maxSpeedMps).toBeLessThanOrEqual(60);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npm test -- geo`
Expected: FAIL — `computeStats` not exported.

- [ ] **Step 3: Add `computeStats` to `lib/geo.ts`**

Append:

```ts
export interface SessionStats {
  distanceMeters: number;
  avgSpeedMps: number;
  maxSpeedMps: number;
  paceSecPerKm: number | null;
}

export function computeStats(points: TrackPoint[], durationSec: number): SessionStats {
  if (points.length < 2) {
    return { distanceMeters: 0, avgSpeedMps: 0, maxSpeedMps: 0, paceSecPerKm: null };
  }
  let distance = 0;
  let maxSpeed = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (curr.segment !== prev.segment) continue;
    distance += haversineMeters(prev, curr);
    const s = curr.speed ?? 0;
    if (s > maxSpeed && s <= MAX_SPEED_MPS) maxSpeed = s;
  }
  const avg = durationSec > 0 ? distance / durationSec : 0;
  const pace = distance >= 50 ? durationSec / (distance / 1000) : null;
  return {
    distanceMeters: distance,
    avgSpeedMps: avg,
    maxSpeedMps: Math.min(maxSpeed, MAX_SPEED_MPS),
    paceSecPerKm: pace,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- geo`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/geo.ts __tests__/geo.test.ts
git commit -m "feat(geo): add computeStats"
```

---

## Task 7: Formatters (`formatDistance`, `formatDuration`, `formatSpeed`, `formatPace`)

**Files:**
- Create: `lib/format.ts`
- Create: `__tests__/format.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { formatDistance, formatDuration, formatSpeed, formatPace } from '@/lib/format';

describe('format', () => {
  it('formatDistance shows m under 1km and km with 2 decimals otherwise', () => {
    expect(formatDistance(450)).toBe('450 m');
    expect(formatDistance(1500)).toBe('1.50 km');
    expect(formatDistance(12345)).toBe('12.35 km');
  });
  it('formatDuration uses mm:ss under 1h and hh:mm:ss otherwise', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(3725)).toBe('01:02:05');
  });
  it('formatSpeed converts m/s to km/h with 1 decimal', () => {
    expect(formatSpeed(10)).toBe('36.0 km/h');
  });
  it('formatPace returns --:-- when null', () => {
    expect(formatPace(null)).toBe('--:--');
    expect(formatPace(300)).toBe('5:00 /km');
  });
});
```

- [ ] **Step 2: Run — expect fail**

Run: `npm test -- format`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `lib/format.ts`:

```ts
const pad = (n: number) => n.toString().padStart(2, '0');

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(sec)}`;
  return `${pad(m)}:${pad(sec)}`;
}

export function formatSpeed(mps: number): string {
  return `${(mps * 3.6).toFixed(1)} km/h`;
}

export function formatPace(secPerKm: number | null): string {
  if (secPerKm == null || !isFinite(secPerKm)) return '--:--';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${pad(s)} /km`;
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npm test -- format`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/format.ts __tests__/format.test.ts
git commit -m "feat(format): add display formatters"
```

---

## Task 8: Firebase init singleton

**Files:**
- Create: `lib/firebase.ts`
- Create/update: `.env` (local, not committed)

- [ ] **Step 1: Add real values to `.env`**

Copy `.env.example` to `.env` and fill the six `EXPO_PUBLIC_FIREBASE_*` vars from the Firebase console (Project settings → General → Your apps → Web app config).

- [ ] **Step 2: Implement `lib/firebase.ts`**

```ts
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const app: FirebaseApp =
  getApps().length > 0 ? getApps()[0] : initializeApp(config);
export const db: Firestore = getFirestore(app);
```

- [ ] **Step 3: Smoke test**

Run: `npx tsc --noEmit`
Expected: no errors referencing `lib/firebase.ts`.

- [ ] **Step 4: Commit**

```bash
git add lib/firebase.ts
git commit -m "feat(firebase): add init singleton"
```

---

## Task 9: Sessions Firestore API

**Files:**
- Create: `lib/sessions.ts`

- [ ] **Step 1: Implement `lib/sessions.ts`**

```ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { TrackPoint } from './geo';

export type SessionType = 'run' | 'bike' | 'drive' | 'generic';

export interface SessionDoc {
  id: string;
  userId: string | null;
  type?: SessionType;
  startedAt: Timestamp;
  endedAt: Timestamp;
  durationSec: number;
  distanceMeters: number;
  avgSpeedMps: number;
  maxSpeedMps: number;
  paceSecPerKm: number | null;
  points: TrackPoint[];
  createdAt: Timestamp;
  schemaVersion: 1;
}

export interface SessionInput {
  userId: string | null;
  type?: SessionType;
  startedAt: Date;
  endedAt: Date;
  durationSec: number;
  distanceMeters: number;
  avgSpeedMps: number;
  maxSpeedMps: number;
  paceSecPerKm: number | null;
  points: TrackPoint[];
}

const COL = 'sessions';

export async function saveSession(input: SessionInput): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    userId: input.userId,
    type: input.type ?? 'generic',
    startedAt: Timestamp.fromDate(input.startedAt),
    endedAt: Timestamp.fromDate(input.endedAt),
    durationSec: input.durationSec,
    distanceMeters: input.distanceMeters,
    avgSpeedMps: input.avgSpeedMps,
    maxSpeedMps: input.maxSpeedMps,
    paceSecPerKm: input.paceSecPerKm,
    points: input.points,
    createdAt: serverTimestamp(),
    schemaVersion: 1,
  });
  return ref.id;
}

export async function listSessions(
  userId: string | null,
  opts: { limit?: number } = {}
): Promise<SessionDoc[]> {
  const base = collection(db, COL);
  const q = userId
    ? query(base, where('userId', '==', userId), orderBy('startedAt', 'desc'), fbLimit(opts.limit ?? 50))
    : query(base, orderBy('startedAt', 'desc'), fbLimit(opts.limit ?? 50));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SessionDoc, 'id'>) }));
}

export async function getSession(id: string): Promise<SessionDoc | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<SessionDoc, 'id'>) };
}

export async function deleteSession(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/sessions.ts
git commit -m "feat(sessions): add firestore CRUD module"
```

---

## Task 10: Pending-session safety slot

**Files:**
- Create: `lib/pendingSession.ts`

- [ ] **Step 1: Implement**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SessionInput } from './sessions';

const KEY = 'pending_session_v1';

export async function savePending(input: SessionInput): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify({
    ...input,
    startedAt: input.startedAt.toISOString(),
    endedAt: input.endedAt.toISOString(),
  }));
}

export async function readPending(): Promise<SessionInput | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  return {
    ...parsed,
    startedAt: new Date(parsed.startedAt),
    endedAt: new Date(parsed.endedAt),
  };
}

export async function clearPending(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
```

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add lib/pendingSession.ts
git commit -m "feat(sessions): add pending-session safety slot"
```

---

## Task 11: `useLocationTracker` hook

**Files:**
- Create: `hooks/useLocationTracker.ts`

- [ ] **Step 1: Implement the hook**

```ts
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { acceptPoint, computeStats, type TrackPoint } from '@/lib/geo';

export type TrackerStatus =
  | 'idle'
  | 'requesting-permission'
  | 'permission-denied'
  | 'ready'
  | 'tracking'
  | 'paused'
  | 'stopped';

const WATCH_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.BestForNavigation,
  timeInterval: 1000,
  distanceInterval: 3,
};

export function useLocationTracker() {
  const [status, setStatus] = useState<TrackerStatus>('idle');
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [canAskAgain, setCanAskAgain] = useState(true);

  const subRef = useRef<Location.LocationSubscription | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const pausedAccumMsRef = useRef(0);
  const pauseStartRef = useRef<number | null>(null);
  const segmentRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPointRef = useRef<TrackPoint | null>(null);

  const clearTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const startTick = useCallback(() => {
    clearTick();
    tickRef.current = setInterval(() => {
      if (!startedAtRef.current) return;
      const raw = Date.now() - startedAtRef.current - pausedAccumMsRef.current;
      setElapsedSec(Math.max(0, Math.floor(raw / 1000)));
    }, 1000);
  }, []);

  const onLocation = useCallback((loc: Location.LocationObject) => {
    if (!startedAtRef.current) return;
    const next: TrackPoint = {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      t: loc.timestamp - startedAtRef.current,
      speed: loc.coords.speed ?? null,
      accuracy: loc.coords.accuracy ?? null,
      segment: segmentRef.current,
    };
    if (!acceptPoint(lastPointRef.current, next)) return;
    lastPointRef.current = next;
    setPoints((prev) => [...prev, next]);
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setStatus('requesting-permission');
    const res = await Location.requestForegroundPermissionsAsync();
    setCanAskAgain(res.canAskAgain);
    if (res.status !== 'granted') {
      setStatus('permission-denied');
      return false;
    }
    setStatus('ready');
    return true;
  }, []);

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
    setPoints([]);
    setElapsedSec(0);
    subRef.current = await Location.watchPositionAsync(WATCH_OPTIONS, onLocation);
    setStatus('tracking');
    startTick();
  }, [onLocation, requestPermission, startTick]);

  const pause = useCallback(() => {
    if (status !== 'tracking') return;
    pauseStartRef.current = Date.now();
    subRef.current?.remove();
    subRef.current = null;
    clearTick();
    setStatus('paused');
  }, [status]);

  const resume = useCallback(async () => {
    if (status !== 'paused') return;
    if (pauseStartRef.current) {
      pausedAccumMsRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
    }
    segmentRef.current += 1;
    lastPointRef.current = null;
    subRef.current = await Location.watchPositionAsync(WATCH_OPTIONS, onLocation);
    setStatus('tracking');
    startTick();
  }, [status, onLocation, startTick]);

  const stop = useCallback(() => {
    subRef.current?.remove();
    subRef.current = null;
    clearTick();
    if (status === 'paused' && pauseStartRef.current) {
      pausedAccumMsRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
    }
    setStatus('stopped');
  }, [status]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next !== 'active' && status === 'tracking') pause();
    });
    return () => sub.remove();
  }, [status, pause]);

  useEffect(() => () => {
    subRef.current?.remove();
    clearTick();
  }, []);

  const stats = useMemo(() => computeStats(points, elapsedSec), [points, elapsedSec]);
  const currentSpeed = useMemo(() => {
    const last = points[points.length - 1];
    return last?.speed ?? 0;
  }, [points]);

  return {
    status,
    canAskAgain,
    points,
    durationSec: elapsedSec,
    startedAt: startedAtRef.current,
    distanceMeters: stats.distanceMeters,
    avgSpeedMps: stats.avgSpeedMps,
    maxSpeedMps: stats.maxSpeedMps,
    paceSecPerKm: stats.paceSecPerKm,
    currentSpeedMps: currentSpeed,
    requestPermission,
    start,
    pause,
    resume,
    stop,
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add hooks/useLocationTracker.ts
git commit -m "feat(tracker): add useLocationTracker hook"
```

---

## Task 12: `darkMapStyle.ts` + `SessionMap` component

**Files:**
- Create: `components/session/darkMapStyle.ts`
- Create: `components/session/SessionMap.tsx`

- [ ] **Step 1: Create `darkMapStyle.ts`**

```ts
export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0b0f14' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b7380' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b0f14' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a212b' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a93a0' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1622' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0d1319' }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#8a93a0' }] },
];
```

- [ ] **Step 2: Implement `SessionMap.tsx`**

```tsx
import React, { useMemo, useRef, useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import type { TrackPoint } from '@/lib/geo';
import { colors } from '@/constants/theme';
import { darkMapStyle } from './darkMapStyle';

interface Props {
  points: TrackPoint[];
  follow: boolean;
  initialRegion?: Region;
  onUserPan?: () => void;
}

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

export function SessionMap({ points, follow, initialRegion, onUserPan }: Props) {
  const mapRef = useRef<MapView | null>(null);
  const segments = useMemo(() => splitSegments(points), [points]);

  useEffect(() => {
    if (!follow || points.length === 0 || !mapRef.current) return;
    const last = points[points.length - 1];
    mapRef.current.animateCamera(
      { center: { latitude: last.lat, longitude: last.lng } },
      { duration: 500 }
    );
  }, [follow, points]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        customMapStyle={Platform.OS === 'android' ? darkMapStyle : undefined}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        onPanDrag={onUserPan}
      >
        {segments.map((seg, idx) => {
          const coords = seg.map((p) => ({ latitude: p.lat, longitude: p.lng }));
          return (
            <React.Fragment key={idx}>
              <Polyline
                coordinates={coords}
                strokeColor={colors.primary + '55'}
                strokeWidth={12}
              />
              <Polyline coordinates={coords} strokeColor={colors.primary} strokeWidth={5} />
            </React.Fragment>
          );
        })}
      </MapView>
    </View>
  );
}
```

- [ ] **Step 3: Type-check and commit**

```bash
npx tsc --noEmit
git add components/session/darkMapStyle.ts components/session/SessionMap.tsx
git commit -m "feat(session): add SessionMap with dark style and glow polyline"
```

---

## Task 13: `StatsSheet` component

**Files:**
- Create: `components/session/StatsSheet.tsx`

- [ ] **Step 1: Implement**

```tsx
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useMemo, useRef } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { colors } from '@/constants/theme';
import { formatDistance, formatDuration, formatPace, formatSpeed } from '@/lib/format';
import type { TrackerStatus } from '@/hooks/useLocationTracker';

interface Props {
  status: TrackerStatus;
  distanceMeters: number;
  durationSec: number;
  currentSpeedMps: number;
  avgSpeedMps: number;
  maxSpeedMps: number;
  paceSecPerKm: number | null;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function StatsSheet(props: Props) {
  const ref = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['15%', '50%', '88%'], []);

  return (
    <BottomSheet
      ref={ref}
      index={1}
      snapPoints={snapPoints}
      handleIndicatorStyle={{ backgroundColor: colors.onSurfaceVariant }}
      backgroundStyle={{ backgroundColor: colors.surfaceContainerLow, borderRadius: 28 }}
    >
      <BottomSheetView style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
        <View className="flex-row justify-between mb-6">
          <Peek label="Distance" value={formatDistance(props.distanceMeters)} />
          <Peek label="Time" value={formatDuration(props.durationSec)} />
          <Peek label="Speed" value={formatSpeed(props.currentSpeedMps)} />
        </View>

        <View className="flex-row mb-6">
          <Stat label="Avg" value={formatSpeed(props.avgSpeedMps)} />
          <Stat label="Max" value={formatSpeed(props.maxSpeedMps)} />
          <Stat label="Pace" value={formatPace(props.paceSecPerKm)} />
        </View>

        <View className="flex-row gap-3">
          {props.status === 'tracking' ? (
            <View className="flex-1"><Button label="Pause" onPress={props.onPause} /></View>
          ) : (
            <View className="flex-1"><Button label="Resume" onPress={props.onResume} /></View>
          )}
          <View className="flex-1"><Button label="Stop" onPress={props.onStop} /></View>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

function Peek({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-label-md text-on-surface-variant">{label}</Text>
      <Text className="text-headline-sm text-on-surface">{value}</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text className="text-label-md text-on-surface-variant">{label}</Text>
      <Text className="text-title-md text-on-surface">{value}</Text>
    </View>
  );
}
```

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add components/session/StatsSheet.tsx
git commit -m "feat(session): add StatsSheet bottom sheet"
```

---

## Task 14: Permission gate view

**Files:**
- Create: `components/session/PermissionGate.tsx`

- [ ] **Step 1: Implement**

```tsx
import React from 'react';
import { Linking, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { GridBackground } from '@/components/GridBackground';

interface Props {
  canAskAgain: boolean;
  onRequest: () => void;
}

export function PermissionGate({ canAskAgain, onRequest }: Props) {
  const handlePress = () => {
    if (canAskAgain) onRequest();
    else Linking.openSettings();
  };
  return (
    <View className="flex-1 bg-surface">
      <GridBackground />
      <SafeAreaView className="flex-1 px-6 justify-center" edges={['top', 'bottom']}>
        <View className="bg-surface-container-high rounded-[32px] p-8 border border-outline-variant">
          <Text className="text-label-md text-primary tracking-[2px] mb-2">Location Required</Text>
          <Text className="text-headline-sm text-on-surface mb-4">Grant GPS Access</Text>
          <Text className="text-body-md text-on-surface-variant mb-6">
            Trackotest needs your location to record distance, speed, and route during a session.
            Nothing is shared off-device without your action.
          </Text>
          <Button label={canAskAgain ? 'Grant Access' : 'Open Settings'} onPress={handlePress} />
        </View>
      </SafeAreaView>
    </View>
  );
}
```

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add components/session/PermissionGate.tsx
git commit -m "feat(session): add PermissionGate view"
```

---

## Task 15: Wrap root layout with gesture + sheet providers

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Read the current file**

```bash
cat app/_layout.tsx
```

- [ ] **Step 2: Wrap the Stack with providers**

Ensure the root layout wraps its content with `GestureHandlerRootView` (required for gesture-handler) and `BottomSheetModalProvider`. Example:

```tsx
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '@/global.css';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="session" options={{ presentation: 'card' }} />
            <Stack.Screen name="session/[id]" options={{ presentation: 'card' }} />
          </Stack>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

If the existing `_layout.tsx` already has theming or fonts loaded, preserve those blocks — only add the three wrappers and the new `Stack.Screen` entries.

- [ ] **Step 3: Type-check and commit**

```bash
npx tsc --noEmit
git add app/_layout.tsx
git commit -m "chore(layout): wrap root with gesture and bottom-sheet providers"
```

---

## Task 16: Session composition root (`app/session.tsx`)

**Files:**
- Modify: `app/session.tsx`

- [ ] **Step 1: Replace the stub with the full screen**

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocationTracker } from '@/hooks/useLocationTracker';
import { SessionMap } from '@/components/session/SessionMap';
import { StatsSheet } from '@/components/session/StatsSheet';
import { PermissionGate } from '@/components/session/PermissionGate';
import { saveSession } from '@/lib/sessions';
import { savePending, clearPending } from '@/lib/pendingSession';
import { colors } from '@/constants/theme';

export default function SessionScreen() {
  const t = useLocationTracker();
  const [saving, setSaving] = useState(false);
  const nav = useNavigation();

  useEffect(() => {
    if (t.status === 'idle') {
      t.start();
    }
  }, [t.status, t]);

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
  }, [nav, t]);

  const handleStop = useCallback(async () => {
    t.stop();
    if (t.points.length < 2) { router.back(); return; }
    setSaving(true);
    const startedAt = new Date(t.startedAt ?? Date.now() - t.durationSec * 1000);
    const input = {
      userId: null,
      type: 'generic' as const,
      startedAt,
      endedAt: new Date(),
      durationSec: t.durationSec,
      distanceMeters: t.distanceMeters,
      avgSpeedMps: t.avgSpeedMps,
      maxSpeedMps: t.maxSpeedMps,
      paceSecPerKm: t.paceSecPerKm,
      points: t.points,
    };
    try {
      await savePending(input);
      await saveSession(input);
      await clearPending();
      router.back();
    } catch (err) {
      setSaving(false);
      Alert.alert('Save failed', 'Your session is kept locally. Retry?', [
        { text: 'Cancel' },
        { text: 'Retry', onPress: handleStop },
      ]);
    }
  }, [t]);

  if (t.status === 'permission-denied') {
    return <PermissionGate canAskAgain={t.canAskAgain} onRequest={t.requestPermission} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <SessionMap points={t.points} follow />
      <SafeAreaView edges={['top']} pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16 }}>
          <Pressable onPress={() => router.back()} style={{ backgroundColor: colors.surfaceContainerLow, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }}>
            <Text style={{ color: colors.onSurface }}>←</Text>
          </Pressable>
          {saving && <Text style={{ color: colors.primary }}>Saving…</Text>}
        </View>
      </SafeAreaView>
      <StatsSheet
        status={t.status}
        distanceMeters={t.distanceMeters}
        durationSec={t.durationSec}
        currentSpeedMps={t.currentSpeedMps}
        avgSpeedMps={t.avgSpeedMps}
        maxSpeedMps={t.maxSpeedMps}
        paceSecPerKm={t.paceSecPerKm}
        onPause={t.pause}
        onResume={t.resume}
        onStop={handleStop}
      />
    </View>
  );
}
```

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add app/session.tsx
git commit -m "feat(session): implement session composition root"
```

---

## Task 17: Recover pending session on app start

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Add recovery effect**

At the top of `RootLayout`, add a `useEffect` that checks for a pending session once on mount and attempts to save it. If successful, clear the slot. If the read returns `null`, do nothing.

```tsx
import { useEffect } from 'react';
import { readPending, clearPending } from '@/lib/pendingSession';
import { saveSession } from '@/lib/sessions';

// inside RootLayout:
useEffect(() => {
  (async () => {
    const pending = await readPending();
    if (!pending) return;
    try {
      await saveSession(pending);
      await clearPending();
    } catch {
      // leave slot in place; will retry next launch
    }
  })();
}, []);
```

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add app/_layout.tsx
git commit -m "feat(sessions): recover pending session on app start"
```

---

## Task 18: Activity list tab

**Files:**
- Modify: `app/(tabs)/activity.tsx`

- [ ] **Step 1: Implement**

```tsx
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GridBackground } from '@/components/GridBackground';
import { listSessions, type SessionDoc } from '@/lib/sessions';
import { formatDistance, formatDuration } from '@/lib/format';

export default function Activity() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<SessionDoc[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await listSessions(null, { limit: 50 });
      setItems(data);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View className="flex-1 bg-surface">
      <GridBackground />
      <SafeAreaView className="flex-1" edges={['top']}>
        <Text className="text-display-sm text-on-surface px-6 py-4">Activity</Text>
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <Text className="text-body-md text-on-surface-variant mt-12 text-center">
              No sessions yet. Tap Start on Home to record your first route.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/session/${item.id}`)}
              className="bg-surface-container-high rounded-2xl p-5 border border-outline-variant"
            >
              <Text className="text-label-md text-on-surface-variant">
                {item.startedAt.toDate().toLocaleString()}
              </Text>
              <View className="flex-row mt-2">
                <Text className="text-title-md text-on-surface flex-1">
                  {formatDistance(item.distanceMeters)}
                </Text>
                <Text className="text-title-md text-on-surface-variant">
                  {formatDuration(item.durationSec)}
                </Text>
              </View>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </View>
  );
}
```

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add app/(tabs)/activity.tsx
git commit -m "feat(activity): list past sessions"
```

---

## Task 19: Session detail screen

**Files:**
- Create: `app/session/[id].tsx`

- [ ] **Step 1: Implement**

```tsx
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SessionMap } from '@/components/session/SessionMap';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/Button';
import { getSession, deleteSession, type SessionDoc } from '@/lib/sessions';
import { formatDistance, formatDuration, formatPace, formatSpeed } from '@/lib/format';
import { colors } from '@/constants/theme';

export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [doc, setDoc] = useState<SessionDoc | null>(null);

  useEffect(() => {
    if (!id) return;
    getSession(id).then(setDoc);
  }, [id]);

  if (!doc) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const onDelete = () => {
    Alert.alert('Delete session?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { await deleteSession(doc.id); router.back(); },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ height: 320 }}>
        <SessionMap points={doc.points} follow={false} />
      </View>
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <Pressable onPress={() => router.back()} style={{ margin: 16, backgroundColor: colors.surfaceContainerLow, alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ color: colors.onSurface }}>←</Text>
        </Pressable>
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text className="text-label-md text-on-surface-variant">
          {doc.startedAt.toDate().toLocaleString()}
        </Text>
        <View className="flex-row mt-4 mb-4">
          <StatCard label="Distance" value={formatDistance(doc.distanceMeters)} unit="" />
          <StatCard label="Time" value={formatDuration(doc.durationSec)} unit="" />
        </View>
        <View className="flex-row mb-8">
          <StatCard label="Avg" value={formatSpeed(doc.avgSpeedMps)} unit="" />
          <StatCard label="Max" value={formatSpeed(doc.maxSpeedMps)} unit="" />
        </View>
        <Text className="text-body-md text-on-surface-variant mb-8">
          Pace {formatPace(doc.paceSecPerKm)}
        </Text>
        <Button label="Delete Session" onPress={onDelete} />
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 2: Type-check and commit**

```bash
npx tsc --noEmit
git add app/session/[id].tsx
git commit -m "feat(session): add session detail screen"
```

---

## Task 20: Manual QA pass

**Files:** none (manual testing).

- [ ] **Step 1: Start the dev client**

```bash
npx expo start
```

Open in Expo Go on a physical device (simulator GPS is unreliable).

- [ ] **Step 2: Run the QA matrix**

Verify each:

1. Fresh install → Home → Start Session → permission dialog appears.
2. Grant → map centers on your location within a few seconds.
3. Walk ~50m → polyline draws behind you; distance and duration tick up.
4. Tap Pause → duration freezes, polyline stops extending.
5. Walk ~20m, tap Resume → a NEW polyline segment starts (a visible gap at the pause point).
6. Tap Stop → "Saving…" indicator → returns to Home.
7. Open Activity tab → new session at top with correct distance + duration.
8. Tap the session → detail screen loads, full route visible.
9. Delete from detail → session gone from list.
10. Start a new session → background the app (home button) → return → confirm snackbar/auto-pause (paused state).
11. Start a session → press hardware back → confirm Stop/Discard/Cancel prompt.
12. Deny permission → Permission gate shows. After second denial (`canAskAgain: false`), "Open Settings" button opens OS settings.
13. Turn off Wi-Fi/data, Stop a session → Save failed alert with Retry. Re-enable network → tap Retry → saves successfully. Restart app with network on → pending session gets uploaded on launch.

- [ ] **Step 3: File issues for any failures**

If any step fails, write a follow-up task against this plan rather than patching in the plan itself.

- [ ] **Step 4: Commit QA notes (optional)**

If you took notes, commit them:

```bash
git add docs/superpowers/plans/qa-notes-$(date +%Y-%m-%d).md
git commit -m "docs(qa): manual QA notes for gps tracking v1"
```

---

## Notes for the implementer

- The `@/` path alias resolves to the project root (see `tsconfig.json`). Every import in this plan assumes that alias.
- `react-native-maps` on Android requires a Google Maps API key at build time for dev builds. In Expo Go on Android the map view renders but without a key it may show a blank tile; iOS Expo Go uses Apple Maps and works without config. If Android maps render blank, add the key per [react-native-maps Expo docs](https://github.com/react-native-maps/react-native-maps/blob/master/docs/installation.md).
- The `Button`, `StatCard`, and `GridBackground` components already exist in `components/`. Reuse them — do not restyle.
- Keep user-facing colors via `colors` from `constants/theme.ts` and NativeWind classes (`text-on-surface`, etc). No ad-hoc hex values.
- Do not mock Firebase in geo/format unit tests. Those modules are pure and have no Firebase imports.
- Do not add background location in this plan — it is Phase 2 and requires a dev build + additional permission flow.
