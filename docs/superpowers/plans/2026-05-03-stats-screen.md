# Stats Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic `activity.tsx` with a full Stats dashboard — sticky header, START NEW SESSION CTA, stats bento (total distance + active days), and a scrollable list of session cards with SVG route thumbnails.

**Architecture:** `FeedHeader` is extracted to a shared component so both Home and Stats reuse it. Stats data is derived client-side via `useMemo` from a single `listSessions()` call. Four new focused components live in `components/stats/`. Two pure helper functions live in `lib/sessionUtils.ts`.

**Tech Stack:** Expo Router, React Native 0.81, TypeScript, `react-native-svg` (already installed), `@expo/vector-icons` Ionicons, `firebase/firestore` Timestamp

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| **Create** | `lib/sessionUtils.ts` | `getSessionName()` + `formatSessionDate()` pure functions |
| **Create** | `lib/__tests__/sessionUtils.test.ts` | Unit tests for both functions |
| **Create** | `components/ui/FeedHeader.tsx` | Shared sticky top bar (TRACKOOO + menu + bell) |
| **Modify** | `app/(tabs)/index.tsx` | Import FeedHeader from shared location |
| **Create** | `components/stats/RouteThumbnail.tsx` | SVG polyline from `TrackPoint[]` |
| **Create** | `components/stats/__tests__/RouteThumbnail.test.tsx` | Snapshot test |
| **Create** | `components/stats/StatsBento.tsx` | Two bento stat cards |
| **Create** | `components/stats/__tests__/StatsBento.test.tsx` | Snapshot test |
| **Create** | `components/stats/SessionCard.tsx` | Full session card (thumbnail + badge + name + stats) |
| **Create** | `components/stats/__tests__/SessionCard.test.tsx` | Snapshot test |
| **Modify** | `app/(tabs)/activity.tsx` | Full replacement — new Stats screen |

---

## Task 1: Session Utility Functions

**Files:**
- Create: `lib/sessionUtils.ts`
- Create: `lib/__tests__/sessionUtils.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/__tests__/sessionUtils.test.ts`:

```typescript
import { Timestamp } from 'firebase/firestore';
import { getSessionName, formatSessionDate } from '../sessionUtils';

const ts = (isoString: string) =>
  Timestamp.fromDate(new Date(isoString));

describe('getSessionName', () => {
  it('returns Morning Run for 07:00 run', () => {
    expect(getSessionName(ts('2024-10-12T07:00:00'), 'run')).toBe('Morning Run');
  });
  it('returns Afternoon Ride for 14:00 bike', () => {
    expect(getSessionName(ts('2024-10-12T14:00:00'), 'bike')).toBe('Afternoon Ride');
  });
  it('returns Evening Workout for 18:00 generic', () => {
    expect(getSessionName(ts('2024-10-12T18:00:00'), 'generic')).toBe('Evening Workout');
  });
  it('returns Night Drive for 23:00 drive', () => {
    expect(getSessionName(ts('2024-10-12T23:00:00'), 'drive')).toBe('Night Drive');
  });
  it('defaults to Workout when type is undefined', () => {
    expect(getSessionName(ts('2024-10-12T07:00:00'), undefined)).toBe('Morning Workout');
  });
});

describe('formatSessionDate', () => {
  it('returns Today label for today', () => {
    const now = new Date();
    const todayTs = Timestamp.fromDate(
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30)
    );
    expect(formatSessionDate(todayTs)).toMatch(/^Today, /);
  });

  it('returns Yesterday label for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(21, 45, 0, 0);
    expect(formatSessionDate(Timestamp.fromDate(yesterday))).toMatch(/^Yesterday, /);
  });

  it('returns month+day for older dates', () => {
    const old = new Date('2024-01-15T06:15:00');
    const result = formatSessionDate(Timestamp.fromDate(old));
    expect(result).toMatch(/Jan 15/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest lib/__tests__/sessionUtils.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../sessionUtils'`

- [ ] **Step 3: Create sessionUtils.ts**

Create `lib/sessionUtils.ts`:

```typescript
import type { Timestamp } from 'firebase/firestore';
import type { SessionType } from './sessions';

export function getSessionName(startedAt: Timestamp, type?: SessionType): string {
  const hour = startedAt.toDate().getHours();
  const period =
    hour >= 5 && hour < 12 ? 'Morning'
    : hour >= 12 && hour < 17 ? 'Afternoon'
    : hour >= 17 && hour < 21 ? 'Evening'
    : 'Night';
  const activity =
    type === 'run' ? 'Run'
    : type === 'bike' ? 'Ride'
    : type === 'drive' ? 'Drive'
    : 'Workout';
  return `${period} ${activity}`;
}

export function formatSessionDate(startedAt: Timestamp): string {
  const date = startedAt.toDate();
  const now = new Date();
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86_400_000;
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (startOfDate === startOfToday) return `Today, ${time}`;
  if (startOfDate === startOfYesterday) return `Yesterday, ${time}`;
  const label = date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  return `${label}, ${time}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest lib/__tests__/sessionUtils.test.ts --no-coverage
```

Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/sessionUtils.ts lib/__tests__/sessionUtils.test.ts
git commit -m "feat: add getSessionName and formatSessionDate utils"
```

---

## Task 2: Extract Shared FeedHeader + Update Home

**Files:**
- Create: `components/ui/FeedHeader.tsx`
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Create shared FeedHeader component**

Create `components/ui/FeedHeader.tsx`:

```typescript
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { colors } from '@/constants/theme';

export const FeedHeader = memo(function FeedHeader() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        height: 56,
        backgroundColor: colors.surface,
      }}
    >
      <Ionicons name="menu" size={24} color={colors.onSurface} />
      <Text
        style={{
          color: colors.primary,
          fontSize: 20,
          fontWeight: '800',
          letterSpacing: 2,
        }}
      >
        TRACKOOO
      </Text>
      <View>
        <Ionicons name="notifications-outline" size={24} color={colors.onSurface} />
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.primary,
          }}
        />
      </View>
    </View>
  );
});
```

- [ ] **Step 2: Update index.tsx to use shared FeedHeader**

In `app/(tabs)/index.tsx`, replace the local `FeedHeader` function and its import with the shared one.

Replace:
```typescript
import Ionicons from "@expo/vector-icons/Ionicons";
```
With:
```typescript
import { FeedHeader } from "@/components/ui/FeedHeader";
```

Remove the entire local `function FeedHeader() { ... }` block (lines 10–55).

The rest of `index.tsx` stays identical — `<FeedHeader />` is already the usage.

- [ ] **Step 3: Verify app still runs**

```bash
npx expo start
```

Home screen should look identical to before.

- [ ] **Step 4: Commit**

```bash
git add components/ui/FeedHeader.tsx app/\(tabs\)/index.tsx
git commit -m "refactor: extract FeedHeader to shared component"
```

---

## Task 3: RouteThumbnail Component

**Files:**
- Create: `components/stats/RouteThumbnail.tsx`
- Create: `components/stats/__tests__/RouteThumbnail.test.tsx`

- [ ] **Step 1: Write failing test**

Create `components/stats/__tests__/RouteThumbnail.test.tsx`:

```typescript
import React from 'react';
import renderer from 'react-test-renderer';
import { RouteThumbnail } from '../RouteThumbnail';
import type { TrackPoint } from '@/lib/geo';

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Polyline: 'Polyline',
}));

const makePoints = (coords: [number, number][]): TrackPoint[] =>
  coords.map(([lat, lng], i) => ({
    lat, lng, t: i * 1000, speed: 3, accuracy: 5, segment: 0,
  }));

describe('RouteThumbnail', () => {
  it('renders SVG polyline for valid points', () => {
    const points = makePoints([[51.5, -0.1], [51.51, -0.09], [51.52, -0.08]]);
    const tree = renderer
      .create(<RouteThumbnail points={points} width={356} height={192} />)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders empty dark box when fewer than 2 points', () => {
    const tree = renderer
      .create(<RouteThumbnail points={[]} width={356} height={192} />)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest components/stats/__tests__/RouteThumbnail.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '../RouteThumbnail'`

- [ ] **Step 3: Create RouteThumbnail component**

Create `components/stats/RouteThumbnail.tsx`:

```typescript
import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { colors } from '@/constants/theme';
import type { TrackPoint } from '@/lib/geo';

type Props = {
  points: TrackPoint[];
  width: number;
  height: number;
};

function buildPointsString(
  points: TrackPoint[],
  width: number,
  height: number,
  padding = 16
): string {
  if (points.length < 2) return '';
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latRange = maxLat - minLat || 1e-6;
  const lngRange = maxLng - minLng || 1e-6;
  const innerW = width - 2 * padding;
  const innerH = height - 2 * padding;
  return points
    .map((p) => {
      const x = padding + ((p.lng - minLng) / lngRange) * innerW;
      const y = padding + ((maxLat - p.lat) / latRange) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export const RouteThumbnail = memo(function RouteThumbnail({
  points,
  width,
  height,
}: Props) {
  const pointsStr = useMemo(
    () => buildPointsString(points, width, height),
    [points, width, height]
  );

  return (
    <View
      style={{
        width,
        height,
        backgroundColor: colors.surfaceDim,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        overflow: 'hidden',
      }}
    >
      {pointsStr.length > 0 && (
        <Svg width={width} height={height}>
          <Polyline
            points={pointsStr}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )}
    </View>
  );
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest components/stats/__tests__/RouteThumbnail.test.tsx --no-coverage
```

Expected: PASS (snapshots written)

- [ ] **Step 5: Commit**

```bash
git add components/stats/RouteThumbnail.tsx components/stats/__tests__/RouteThumbnail.test.tsx
git commit -m "feat: add RouteThumbnail SVG component"
```

---

## Task 4: StatsBento Component

**Files:**
- Create: `components/stats/StatsBento.tsx`
- Create: `components/stats/__tests__/StatsBento.test.tsx`

- [ ] **Step 1: Write failing test**

Create `components/stats/__tests__/StatsBento.test.tsx`:

```typescript
import React from 'react';
import renderer from 'react-test-renderer';
import { StatsBento } from '../StatsBento';

describe('StatsBento', () => {
  it('renders total distance and active days', () => {
    const tree = renderer
      .create(<StatsBento totalKm={124.3} activeDays={5} />)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders zero state', () => {
    const tree = renderer
      .create(<StatsBento totalKm={0} activeDays={0} />)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest components/stats/__tests__/StatsBento.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '../StatsBento'`

- [ ] **Step 3: Create StatsBento component**

Create `components/stats/StatsBento.tsx`:

```typescript
import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { colors } from '@/constants/theme';

type BentoCardProps = {
  label: string;
  value: string;
  unit: string;
};

function BentoCard({ label, value, unit }: BentoCardProps) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surfaceContainerLow,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        padding: 16,
      }}
    >
      <Text
        style={{
          color: colors.onSurfaceVariant,
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.8,
          marginBottom: 8,
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <Text
          style={{
            color: colors.onSurface,
            fontSize: 40,
            fontWeight: '700',
            lineHeight: 44,
          }}
        >
          {value}
        </Text>
        <Text
          style={{
            color: colors.onSurfaceVariant,
            fontSize: 20,
            fontWeight: '500',
            marginLeft: 4,
            marginBottom: 4,
          }}
        >
          {unit}
        </Text>
      </View>
    </View>
  );
}

type Props = {
  totalKm: number;
  activeDays: number;
};

export const StatsBento = memo(function StatsBento({ totalKm, activeDays }: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 8,
        marginTop: 16,
      }}
    >
      <BentoCard label="TOTAL DISTANCE" value={totalKm.toFixed(1)} unit="km" />
      <BentoCard label="ACTIVE DAYS" value={String(activeDays)} unit="/7" />
    </View>
  );
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest components/stats/__tests__/StatsBento.test.tsx --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/stats/StatsBento.tsx components/stats/__tests__/StatsBento.test.tsx
git commit -m "feat: add StatsBento component"
```

---

## Task 5: SessionCard Component

**Files:**
- Create: `components/stats/SessionCard.tsx`
- Create: `components/stats/__tests__/SessionCard.test.tsx`

- [ ] **Step 1: Write failing test**

Create `components/stats/__tests__/SessionCard.test.tsx`:

```typescript
import React from 'react';
import renderer from 'react-test-renderer';
import { SessionCard } from '../SessionCard';
import { Timestamp } from 'firebase/firestore';
import type { SessionDoc } from '@/lib/sessions';

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Polyline: 'Polyline',
}));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

const mockSession: SessionDoc = {
  id: 'abc123',
  userId: null,
  type: 'run',
  startedAt: Timestamp.fromDate(new Date('2024-10-12T21:45:00')),
  endedAt: Timestamp.fromDate(new Date('2024-10-12T22:23:12')),
  durationSec: 2292,
  distanceMeters: 8400,
  avgSpeedMps: 3.67,
  maxSpeedMps: 5.1,
  paceSecPerKm: 272,
  points: [
    { lat: 51.5, lng: -0.1, t: 0, speed: 3, accuracy: 5, segment: 0 },
    { lat: 51.51, lng: -0.09, t: 1000, speed: 3.5, accuracy: 5, segment: 0 },
  ],
  steps: 9800,
  createdAt: Timestamp.fromDate(new Date('2024-10-12T22:23:12')),
  schemaVersion: 1,
};

describe('SessionCard', () => {
  it('renders run session card', () => {
    const tree = renderer
      .create(
        <SessionCard
          session={mockSession}
          cardWidth={358}
          onPress={jest.fn()}
        />
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest components/stats/__tests__/SessionCard.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '../SessionCard'`

- [ ] **Step 3: Create SessionCard component**

Create `components/stats/SessionCard.tsx`:

```typescript
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/constants/theme';
import { formatDistance, formatDuration, formatPace, formatSpeed } from '@/lib/format';
import type { SessionDoc, SessionType } from '@/lib/sessions';
import { formatSessionDate, getSessionName } from '@/lib/sessionUtils';
import { RouteThumbnail } from './RouteThumbnail';

const TYPE_ICON: Record<SessionType, React.ComponentProps<typeof Ionicons>['name']> = {
  run: 'walk',
  bike: 'bicycle',
  drive: 'car',
  generic: 'fitness',
};

const TYPE_LABEL: Record<SessionType, string> = {
  run: 'RUN',
  bike: 'RIDE',
  drive: 'DRIVE',
  generic: 'WORKOUT',
};

type StatColProps = { label: string; value: string };

function StatCol({ label, value }: StatColProps) {
  return (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          color: colors.onSurfaceVariant,
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.8,
          marginBottom: 4,
        }}
      >
        {label}
      </Text>
      <Text style={{ color: colors.onSurface, fontSize: 16, fontWeight: '600' }}>
        {value}
      </Text>
    </View>
  );
}

type Props = {
  session: SessionDoc;
  cardWidth: number;
  onPress: (id: string) => void;
};

export const SessionCard = memo(function SessionCard({
  session,
  cardWidth,
  onPress,
}: Props) {
  const handlePress = useCallback(() => onPress(session.id), [session.id, onPress]);
  const type = session.type ?? 'generic';
  const isSpeedBased = type === 'bike' || type === 'drive';
  const col2Label = isSpeedBased ? 'AVG SPEED' : 'AVG PACE';
  const col2Value = isSpeedBased
    ? formatSpeed(session.avgSpeedMps)
    : formatPace(session.paceSecPerKm);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      style={{
        backgroundColor: colors.surfaceContainerLow,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        overflow: 'hidden',
      }}
    >
      {/* Thumbnail + badge */}
      <View>
        <RouteThumbnail points={session.points} width={cardWidth} height={192} />
        <View
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfaceContainer + 'D9',
            borderRadius: 4,
            paddingHorizontal: 8,
            paddingVertical: 4,
            gap: 4,
          }}
        >
          <Ionicons name={TYPE_ICON[type]} size={12} color={colors.onSurface} />
          <Text style={{ color: colors.onSurface, fontSize: 11, fontWeight: '600' }}>
            {TYPE_LABEL[type]}
          </Text>
        </View>
      </View>

      {/* Info */}
      <View style={{ padding: 16 }}>
        <Text
          style={{
            color: colors.onSurface,
            fontSize: 18,
            fontWeight: '700',
            letterSpacing: 0.5,
            marginBottom: 2,
          }}
        >
          {getSessionName(session.startedAt, session.type).toUpperCase()}
        </Text>
        <Text
          style={{ color: colors.onSurfaceVariant, fontSize: 13, marginBottom: 16 }}
        >
          {formatSessionDate(session.startedAt)}
        </Text>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <StatCol label="DISTANCE" value={formatDistance(session.distanceMeters)} />
          <View
            style={{
              width: 1,
              backgroundColor: colors.outlineVariant,
              alignSelf: 'stretch',
              marginHorizontal: 8,
            }}
          />
          <StatCol label={col2Label} value={col2Value} />
          <View
            style={{
              width: 1,
              backgroundColor: colors.outlineVariant,
              alignSelf: 'stretch',
              marginHorizontal: 8,
            }}
          />
          <StatCol label="TIME" value={formatDuration(session.durationSec)} />
        </View>
      </View>
    </TouchableOpacity>
  );
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest components/stats/__tests__/SessionCard.test.tsx --no-coverage
```

Expected: PASS (snapshot written)

- [ ] **Step 5: Commit**

```bash
git add components/stats/SessionCard.tsx components/stats/__tests__/SessionCard.test.tsx
git commit -m "feat: add SessionCard component"
```

---

## Task 6: Rebuild Stats Screen

**Files:**
- Modify: `app/(tabs)/activity.tsx`

- [ ] **Step 1: Write failing test**

Create `app/(tabs)/__tests__/activity.test.tsx`:

```typescript
import React from 'react';
import renderer from 'react-test-renderer';
import Stats from '../activity';

jest.mock('react-native-svg', () => ({ __esModule: true, default: 'Svg', Polyline: 'Polyline' }));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useFocusEffect: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34 }),
}));
jest.mock('@/lib/sessions', () => ({
  listSessions: jest.fn().mockResolvedValue([]),
}));

describe('Stats screen', () => {
  it('renders without crashing', () => {
    const tree = renderer.create(<Stats />).toJSON();
    expect(tree).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test**

```bash
npx jest "app/\(tabs\)/__tests__/activity.test.tsx" --no-coverage
```

Expected: May PASS or FAIL with current screen — note result.

- [ ] **Step 3: Replace activity.tsx with Stats screen**

Replace full content of `app/(tabs)/activity.tsx`:

```typescript
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { Dimensions, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FeedHeader } from '@/components/ui/FeedHeader';
import { SessionCard } from '@/components/stats/SessionCard';
import { StatsBento } from '@/components/stats/StatsBento';
import { colors } from '@/constants/theme';
import { listSessions, type SessionDoc } from '@/lib/sessions';

const CARD_WIDTH = Dimensions.get('window').width - 32;

type ListHeaderProps = {
  totalKm: number;
  activeDays: number;
  onStart: () => void;
};

const StatsListHeader = memo(function StatsListHeader({
  totalKm,
  activeDays,
  onStart,
}: ListHeaderProps) {
  return (
    <View>
      <TouchableOpacity
        onPress={onStart}
        activeOpacity={0.85}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginHorizontal: 0,
          marginTop: 8,
          height: 46,
          backgroundColor: colors.primary,
          borderRadius: 8,
          gap: 8,
        }}
      >
        <Ionicons name="play" size={14} color={colors.onPrimary} />
        <Text
          style={{
            color: colors.onPrimary,
            fontSize: 14,
            fontWeight: '700',
            letterSpacing: 1,
          }}
        >
          START NEW SESSION
        </Text>
      </TouchableOpacity>

      <StatsBento totalKm={totalKm} activeDays={activeDays} />

      <Text
        style={{
          color: colors.onSurface,
          fontSize: 20,
          fontWeight: '700',
          letterSpacing: 0.5,
          marginTop: 24,
          marginBottom: 8,
        }}
      >
        RECENT SESSIONS
      </Text>
    </View>
  );
});

export default function Stats() {
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setSessions(await listSessions(null, { limit: 50 }));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totalKm = useMemo(
    () => sessions.reduce((acc, s) => acc + s.distanceMeters / 1000, 0),
    [sessions]
  );

  const activeDays = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const days = new Set(
      sessions
        .filter((s) => s.startedAt.toDate().getTime() >= sevenDaysAgo)
        .map((s) => s.startedAt.toDate().toDateString())
    );
    return days.size;
  }, [sessions]);

  const handleStart = useCallback(() => router.push('/session'), []);
  const handleCardPress = useCallback((id: string) => router.push(`/session/${id}`), []);

  const renderItem = useCallback(
    ({ item }: { item: SessionDoc }) => (
      <SessionCard session={item} cardWidth={CARD_WIDTH} onPress={handleCardPress} />
    ),
    [handleCardPress]
  );

  const keyExtractor = useCallback((item: SessionDoc) => item.id, []);

  const listHeader = useMemo(
    () => (
      <StatsListHeader
        totalKm={totalKm}
        activeDays={activeDays}
        onStart={handleStart}
      />
    ),
    [totalKm, activeDays, handleStart]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ paddingTop: insets.top, backgroundColor: colors.surface }}>
        <FeedHeader />
      </View>
      <FlatList
        data={sessions}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 80,
          gap: 12,
        }}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={load}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !refreshing ? (
            <Text
              style={{
                color: colors.onSurfaceVariant,
                fontSize: 14,
                textAlign: 'center',
                marginTop: 48,
              }}
            >
              No sessions yet. Tap Start New Session to record your first route.
            </Text>
          ) : null
        }
        removeClippedSubviews
      />
    </View>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest "app/\(tabs\)/__tests__/activity.test.tsx" --no-coverage
```

Expected: PASS

- [ ] **Step 5: Start the app and verify visually**

```bash
npx expo start
```

Check on STATS tab:
- [ ] TRACKOOO header sticky at top
- [ ] Green START NEW SESSION button below header
- [ ] Two bento cards: TOTAL DISTANCE and ACTIVE DAYS with real values from Firestore
- [ ] RECENT SESSIONS label
- [ ] Session cards with dark SVG route thumbnail, RUN/RIDE/etc badge, session name, date, 3-col stats
- [ ] Pull-to-refresh works and updates bento + list
- [ ] Tapping a card navigates to session detail screen

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/activity.tsx" "app/(tabs)/__tests__/activity.test.tsx"
git commit -m "feat: rebuild Stats screen with route thumbnails and bento stats"
```
