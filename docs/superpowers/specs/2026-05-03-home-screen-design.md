# Home Screen Design Spec
**Date:** 2026-05-03
**Status:** Approved — Figma design is source of truth
**Figma:** https://www.figma.com/design/FIz1i8ueyy6bXq7ObG13oN/Untitled?node-id=0-1

---

## Scope

This spec covers two screens visible in the Figma:
1. **Home Screen** — social feed with stories + post cards
2. **Activity Screen** — past sessions dashboard (separate spec phase)

**Current implementation priority: Home Screen only.**

Post creation (the `+` FAB tab) will be implemented later as an Instagram-style camera-first flow (camera opens immediately, option to switch to gallery).

---

## Screen 1 — Home Screen

### Overall Structure

One unified `FlatList`. Only the top header is sticky. Stories row and post feed scroll together.

```
Status bar (dark)
─────────────────────────────
Header (sticky): ☰  TRACKOOO  🔔
─────────────────────────────
Stories row          ← scrolls with feed
─────────────────────────────
Post card
Post card
...
─────────────────────────────
Tab bar (sticky bottom)
```

**Background:** `#0D0D0D`

---

### Top Header

- Height: 64px + safe area top inset
- Background: `#0D0D0D`
- Left: hamburger menu icon (3 lines)
- Center: "TRACKOOO" in **primary green** (from Stitch/Figma tokens), bold, uppercase
- Right: notification bell icon with small unread dot badge
- No bottom border (flows into content)

---

### Stories Row

Rendered as `ListHeaderComponent` of the feed FlatList so it scrolls with posts.

- Horizontal `ScrollView`, no scroll indicator
- 16px left padding, ~16px gap between items
- Height: ~113px total (96px content + 16px padding each side)
- Each story item:
  - 60px circular avatar
  - 2px ring: **primary green** (unseen) / `#444` (seen)
  - Username below, white, 11–12px, truncated
- First item — **"Add Story"**:
  - Circle with dashed/styled border in primary green
  - Plus icon centered inside
  - Label: "ADD STORY" in green, 11px

---

### Post Card

Edge-to-edge, no border radius. Cards separated by a thin dark line.

#### Photo
- Full device width
- 4:5 aspect ratio (`width / 0.8` height)
- No border radius, no margins

#### Floating Header (overlaid on photo)
- `black → transparent` vertical gradient, ~68px tall from top of photo
- Left: 36px circular avatar + username (white, semi-bold, ~16px) stacked above timestamp (grey, ~12px)
- No timestamp on right side — timestamp is below username on the left

#### Footer Bar
- Background: `#0D0D0D` (same as screen bg)
- 16px horizontal padding
- Row 1: ♡ icon + like count (e.g. "1.2K") in white
- Row 2: Caption text, white, ~14px, truncated to 2 lines with "more" to expand
- **No comment button in this version**

---

### Tab Bar

5 tabs. Background: `#0D0D0D` with subtle top border.

| Position | Tab | Label |
|---|---|---|
| 1 | Home | HOME |
| 2 | Stats/Activity | STATS |
| 3 | Create Post | `+` (center FAB) |
| 4 | Audio/Music | AUDIO |
| 5 | Profile | PROFILE |

- **Center FAB (`+`)**: 56px circle, primary green fill, white `+` icon, floats above bar
- Active tab: primary green icon + label
- Inactive tab: grey icon + label (11–12px)

---

## Screen 2 — Activity Screen (reference only, implement later)

### Structure
- Same header (TRACKOOO + bell)
- Full-width "START NEW SESSION" green CTA button
- Stats bento row: Total Distance | Active Days
- "RECENT SESSIONS" section
- Session cards: map route thumbnail + activity type badge (RUN/RIDE) + session name + date + Distance/Pace/Speed/Time stats

---

## Implementation Notes

### What changes in the existing codebase

| Current | New |
|---|---|
| `app/(tabs)/index.tsx` — generic home | Replace with feed layout (stories + FlatList of post cards) |
| Tab bar — Home + Activity only | 5 tabs: Home, Stats, `+`, Audio, Profile |
| No stories component | New `StoriesRow` component |
| No post card component | New `PostCard` component |

### New components needed
- `components/feed/StoriesRow.tsx`
- `components/feed/PostCard.tsx`
- `components/feed/StoryItem.tsx`

### Data (mock for now)
- Stories: static array of `{ id, username, avatarUrl, seen }` 
- Posts: static array of `{ id, username, avatarUrl, timestamp, imageUrl, likes, caption }`
- No backend wiring in this phase

### Out of scope for this phase
- Post creation flow (camera/gallery)
- Likes/comments functionality (taps do nothing yet)
- Audio tab screen
- Profile screen
- Real data from Firestore

---

## Google Stitch Prompt (for reference)

> Design a dark-mode mobile app home screen for a fitness social app called "Trackooo" (like Strava meets Snapchat for runners).
>
> **Overall style:** Dark background (#0D0D0D), premium sporty feel, edge-to-edge photos, no rounded card borders. Use a bright lime/neon green primary color for branded elements.
>
> **Top header (sticky):** Hamburger menu icon on the left. "TRACKOOO" in bold uppercase primary green centered. Notification bell with small badge dot on the right. No bottom border.
>
> **Stories row (scrolls with feed):** Horizontal row of 60px circular story avatars. Each has a 2px green ring (unseen) or grey ring (seen) and a short username label below. First item is "Add Story" with a plus icon and green dashed border ring, labeled "ADD STORY" in green.
>
> **Post feed (vertical scroll):** Full-width post cards, no border radius. Each card:
> - Full-width photo at 4:5 aspect ratio with NO border radius
> - Floating header overlaid on top with black-to-transparent gradient: 36px circular avatar + username (white semi-bold) above timestamp (grey small) — both on the left side
> - Dark footer (#0D0D0D): heart icon + like count (e.g. "1.2K") on first row, caption text on second row truncated to 2 lines
>
> **Bottom tab bar:** 5 tabs — HOME, STATS, + (center FAB, 56px green circle floating above bar), AUDIO, PROFILE. Active tab in primary green. Dark background.
>
> Show 2 post cards and a stories row. Apply consistent dark neon-green design tokens throughout.
