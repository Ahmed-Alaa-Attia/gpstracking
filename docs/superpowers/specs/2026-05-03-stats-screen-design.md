# Stats Screen Design Spec
**Date:** 2026-05-03
**Status:** Approved
**Figma:** https://www.figma.com/design/FIz1i8ueyy6bXq7ObG13oN/Untitled?node-id=0-1

---

## Overview

The Stats screen replaces the existing generic `activity.tsx`. It shows a dashboard of the user's fitness history: a summary bento, a CTA to start a new session, and a list of past session cards with route thumbnails.

---

## Screen Structure

Single `FlatList`. Header (sticky) + `ListHeaderComponent` containing CTA + bento + section label. Sessions list below.

```
Header (sticky): ☰ TRACKOOO 🔔
─────────────────────────────
▶ START NEW SESSION            ← ListHeaderComponent start
─────────────────────────────
[ TOTAL DISTANCE ] [ ACTIVE DAYS ]
─────────────────────────────
RECENT SESSIONS                ← ListHeaderComponent end
─────────────────────────────
Session card
Session card
...
─────────────────────────────
Tab bar
```

Background: `#0D0D0D`

---

## Header

Reuse `FeedHeader` component from home screen. No duplication.

---

## CTA Button

- Full-width, 46px height, 8px radius
- Background: `colors.primary` (green), text: `colors.onPrimary`, bold uppercase
- Label: `▶  START NEW SESSION`
- `onPress`: `router.push('/session')`
- 16px horizontal margin, 16px top margin

---

## Stats Bento

Two equal-width cards in a row, 8px gap, 16px horizontal padding.

Each card:
- Background: `colors.surfaceContainerLow`
- 1px `colors.outlineVariant` border, 8px radius
- Label: uppercase 11px `onSurfaceVariant`
- Value: bold 40px `onSurface`
- Unit: 20px `onSurfaceVariant` inline with value

**Card 1 — Total Distance**
- Label: `TOTAL DISTANCE`
- Value: sum of all `session.distanceMeters / 1000`, rounded to 1 decimal
- Unit: `km`

**Card 2 — Active Days**
- Label: `ACTIVE DAYS`
- Value: count of unique calendar days in last 7 days that have ≥1 session
- Unit: `/7`

Both computed client-side from the same `sessions` array. Recomputed on every refresh.

---

## Session Card

- Background: `colors.surfaceContainerLow`, 12px radius, 1px `colors.outlineVariant` border
- Tapping navigates to `router.push('/session/${item.id}')`
- `React.memo` + stable `onPress` per card

### Route Thumbnail
- Height: 192px, full card width
- Background: `colors.surfaceDim` (`#0A0E14`)
- Rounded top corners (12px) matching card
- SVG `<Polyline>` drawn from `item.points[]` using `react-native-svg`
- Points normalized: find bounding box of lat/lng, scale to fit canvas with 16px padding
- Stroke: `colors.primary`, width: 2.5, no fill
- If `points.length < 2`: show empty dark rectangle (no crash)

### Activity Type Badge
- Positioned absolute top-right of thumbnail, 12px from edges
- Pill shape: `surfaceContainer` bg at 85% opacity, 4px radius
- Icon (Ionicons): `walk` / `bicycle` / `car` / `fitness` mapped from `SessionType`
- Label: type string uppercased, 11px, `onSurface`

### Session Name (auto-generated)
- Derived from `startedAt` hour + `type` — pure function `getSessionName(startedAt, type)`
- Hour buckets: 5–11 → "Morning", 12–16 → "Afternoon", 17–20 → "Evening", else → "Night"
- Type map: `run` → "Run", `bike` → "Ride", `drive` → "Drive", `generic` → "Workout"
- Result: `"Morning Run"`, `"Night Ride"`, `"Evening Workout"` etc.
- Style: bold white 18px uppercase

### Date Line
- `"Yesterday, HH:MM"` if startedAt is yesterday
- `"Today, HH:MM"` if today
- Otherwise `"MMM DD, HH:MM"` (e.g. `"Oct 12, 06:15"`)
- Style: `onSurfaceVariant`, 13px
- Pure function `formatSessionDate(startedAt: Timestamp): string`

### Stats Row
- 3 equal columns separated by 1px `outlineVariant` vertical dividers
- Each column: label (uppercase 11px `onSurfaceVariant`) above value+unit
- Column 1: DISTANCE — `formatDistance(distanceMeters)`
- Column 2: AVG PACE (run/walk) or AVG SPEED (bike/drive) — determined by type
- Column 3: TIME — `formatDuration(durationSec)`

---

## Data Loading

Reuse existing `listSessions(null, { limit: 50 })`. No new Firestore queries.

```typescript
const [sessions, setSessions] = useState<SessionDoc[]>([]);
const [refreshing, setRefreshing] = useState(false);

const load = useCallback(async () => {
  setRefreshing(true);
  try { setSessions(await listSessions(null, { limit: 50 })); }
  finally { setRefreshing(false); }
}, []);

useFocusEffect(useCallback(() => { load(); }, [load]));
```

Stats derived with `useMemo`:
```typescript
const totalKm = useMemo(
  () => sessions.reduce((acc, s) => acc + s.distanceMeters / 1000, 0),
  [sessions]
);
const activeDays = useMemo(() => {
  const now = new Date();
  const days = new Set(
    sessions
      .filter(s => {
        const d = s.startedAt.toDate();
        return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
      })
      .map(s => s.startedAt.toDate().toDateString())
  );
  return days.size;
}, [sessions]);
```

---

## New Files

| File | Responsibility |
|---|---|
| `components/stats/RouteThumbnail.tsx` | SVG polyline from points[], normalized to canvas |
| `components/stats/SessionCard.tsx` | Full session card (thumbnail + badge + name + date + stats row) |
| `components/stats/StatsBento.tsx` | Two-card bento row |
| `lib/sessionUtils.ts` | `getSessionName()`, `formatSessionDate()` pure functions |

## Modified Files

| File | Change |
|---|---|
| `app/(tabs)/activity.tsx` | Full replacement with new Stats screen |

---

## Performance

- `SessionCard` wrapped in `React.memo`
- `renderItem` in `useCallback`
- `keyExtractor` in `useCallback`
- `RouteThumbnail` wrapped in `React.memo` — points array reference stable from Firestore (same object per session)
- `ListHeaderComponent` as a memoised element (depends on `totalKm` + `activeDays`)
