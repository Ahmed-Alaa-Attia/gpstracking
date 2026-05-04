# Home Screen Feed Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic home tab with a social feed (stories row + full-width post cards) and update the tab bar to 5 tabs with a floating green FAB center button, matching the approved Figma design.

**Architecture:** New `components/feed/` directory holds `StoryItem`, `StoriesRow`, and `PostCard`. The home screen's `FlatList` uses `StoriesRow` as `ListHeaderComponent` so stories scroll with the feed. The tab bar is rebuilt with a custom `FabButton` component passed as `tabBarButton` to the center tab. All data is mocked in `lib/mockFeedData.ts` — no Firestore changes this phase.

**Tech Stack:** Expo Router v6, React Native 0.81, NativeWind v5 (Tailwind v4), TypeScript, `expo-image` (already installed), `expo-linear-gradient` (install required), `@expo/vector-icons` Ionicons (already installed)

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Install | `expo-linear-gradient` | Gradient overlay on post card photo |
| **Create** | `lib/mockFeedData.ts` | Static `Story[]` and `Post[]` arrays |
| **Create** | `components/feed/StoryItem.tsx` | Single story avatar circle + ring + label |
| **Create** | `components/feed/StoriesRow.tsx` | Horizontal `ScrollView` of `StoryItem`s |
| **Create** | `components/feed/PostCard.tsx` | Full-width photo card with gradient header + footer |
| **Create** | `app/(tabs)/audio.tsx` | Placeholder Audio screen |
| **Create** | `app/(tabs)/profile.tsx` | Placeholder Profile screen |
| **Create** | `app/(tabs)/create.tsx` | Placeholder Create Post screen (FAB target) |
| **Modify** | `app/(tabs)/index.tsx` | Replace generic home with FlatList feed |
| **Modify** | `app/(tabs)/_layout.tsx` | 5-tab bar + floating FAB + hide wallet/settings |

---

## Task 1: Install expo-linear-gradient

**Files:**
- Modify: `package.json` (via expo install)

- [ ] **Step 1: Install the package**

```bash
npx expo install expo-linear-gradient
```

Expected: `expo-linear-gradient` added to `package.json` dependencies.

- [ ] **Step 2: Verify install**

```bash
node -e "require('./node_modules/expo-linear-gradient/package.json'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add expo-linear-gradient"
```

---

## Task 2: Mock Feed Data

**Files:**
- Create: `lib/mockFeedData.ts`
- Create: `lib/__tests__/mockFeedData.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/mockFeedData.test.ts`:

```typescript
import { MOCK_STORIES, MOCK_POSTS } from '../mockFeedData';

describe('mockFeedData', () => {
  it('has at least 3 stories with isOwn first', () => {
    expect(MOCK_STORIES.length).toBeGreaterThanOrEqual(3);
    expect(MOCK_STORIES[0].isOwn).toBe(true);
  });

  it('has at least 2 posts', () => {
    expect(MOCK_POSTS.length).toBeGreaterThanOrEqual(2);
  });

  it('each post has required fields', () => {
    MOCK_POSTS.forEach((post) => {
      expect(post.id).toBeDefined();
      expect(post.username).toBeDefined();
      expect(post.imageUrl).toBeDefined();
      expect(typeof post.likes).toBe('number');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest lib/__tests__/mockFeedData.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../mockFeedData'`

- [ ] **Step 3: Create mock data file**

Create `lib/mockFeedData.ts`:

```typescript
export type Story = {
  id: string;
  username: string;
  avatarUrl: string;
  seen: boolean;
  isOwn: boolean;
};

export type Post = {
  id: string;
  username: string;
  avatarUrl: string;
  timestamp: string;
  imageUrl: string;
  likes: number;
  caption: string;
};

export const MOCK_STORIES: Story[] = [
  {
    id: 'own',
    username: 'Your Story',
    avatarUrl: 'https://i.pravatar.cc/150?img=1',
    seen: false,
    isOwn: true,
  },
  {
    id: 's1',
    username: 'ALEX_99',
    avatarUrl: 'https://i.pravatar.cc/150?img=5',
    seen: false,
    isOwn: false,
  },
  {
    id: 's2',
    username: 'SARAH_B',
    avatarUrl: 'https://i.pravatar.cc/150?img=9',
    seen: true,
    isOwn: false,
  },
  {
    id: 's3',
    username: 'MIKE_T',
    avatarUrl: 'https://i.pravatar.cc/150?img=12',
    seen: true,
    isOwn: false,
  },
  {
    id: 's4',
    username: 'JESS',
    avatarUrl: 'https://i.pravatar.cc/150?img=20',
    seen: true,
    isOwn: false,
  },
];

export const MOCK_POSTS: Post[] = [
  {
    id: 'p1',
    username: 'ALEX_99',
    avatarUrl: 'https://i.pravatar.cc/150?img=5',
    timestamp: '3 HOURS AGO',
    imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800',
    likes: 1200,
    caption:
      'New personal record on the deadlift. The grind never stops. Fueled by anger and love.',
  },
  {
    id: 'p2',
    username: 'SARAH_B',
    avatarUrl: 'https://i.pravatar.cc/150?img=9',
    timestamp: '5 HOURS AGO',
    imageUrl: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800',
    likes: 856,
    caption:
      "Late night miles hit different. The city is empty and it's just you against the asphalt.",
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest lib/__tests__/mockFeedData.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/mockFeedData.ts lib/__tests__/mockFeedData.test.ts
git commit -m "feat: add mock feed data types and fixtures"
```

---

## Task 3: StoryItem Component

**Files:**
- Create: `components/feed/StoryItem.tsx`
- Create: `components/feed/__tests__/StoryItem.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/feed/__tests__/StoryItem.test.tsx`:

```typescript
import React from 'react';
import renderer from 'react-test-renderer';
import { StoryItem } from '../StoryItem';

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

describe('StoryItem', () => {
  it('renders unseen story', () => {
    const tree = renderer
      .create(
        <StoryItem
          id="s1"
          username="ALEX_99"
          avatarUrl="https://i.pravatar.cc/150?img=5"
          seen={false}
          isOwn={false}
        />
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders own add-story item', () => {
    const tree = renderer
      .create(
        <StoryItem
          id="own"
          username="Your Story"
          avatarUrl="https://i.pravatar.cc/150?img=1"
          seen={false}
          isOwn={true}
        />
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest components/feed/__tests__/StoryItem.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '../StoryItem'`

- [ ] **Step 3: Create StoryItem component**

Create `components/feed/StoryItem.tsx`:

```typescript
import { Image } from 'expo-image';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/constants/theme';

type Props = {
  id: string;
  username: string;
  avatarUrl: string;
  seen: boolean;
  isOwn: boolean;
  onPress?: () => void;
};

export function StoryItem({ username, avatarUrl, seen, isOwn, onPress }: Props) {
  const ringColor = seen ? '#444444' : colors.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{ alignItems: 'center', width: 76 }}
    >
      {/* Ring */}
      <View
        style={{
          width: 68,
          height: 68,
          borderRadius: 34,
          borderWidth: 2,
          borderColor: isOwn ? colors.primary : ringColor,
          borderStyle: isOwn ? 'dashed' : 'solid',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 6,
        }}
      >
        {isOwn ? (
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: colors.surfaceContainerHigh,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.primary, fontSize: 26, lineHeight: 30 }}>+</Text>
          </View>
        ) : (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: 60, height: 60, borderRadius: 30 }}
            contentFit="cover"
          />
        )}
      </View>

      {/* Label */}
      <Text
        numberOfLines={1}
        style={{
          color: isOwn ? colors.primary : colors.onSurface,
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.5,
          maxWidth: 72,
          textAlign: 'center',
        }}
      >
        {username.toUpperCase()}
      </Text>
    </TouchableOpacity>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest components/feed/__tests__/StoryItem.test.tsx --no-coverage
```

Expected: PASS (snapshots written to `__snapshots__/StoryItem.test.tsx.snap`)

- [ ] **Step 5: Commit**

```bash
git add components/feed/StoryItem.tsx components/feed/__tests__/StoryItem.test.tsx
git commit -m "feat: add StoryItem component"
```

---

## Task 4: StoriesRow Component

**Files:**
- Create: `components/feed/StoriesRow.tsx`
- Create: `components/feed/__tests__/StoriesRow.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/feed/__tests__/StoriesRow.test.tsx`:

```typescript
import React from 'react';
import renderer from 'react-test-renderer';
import { StoriesRow } from '../StoriesRow';
import { MOCK_STORIES } from '@/lib/mockFeedData';

jest.mock('expo-image', () => ({ Image: 'Image' }));

describe('StoriesRow', () => {
  it('renders all story items', () => {
    const tree = renderer
      .create(<StoriesRow stories={MOCK_STORIES} />)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest components/feed/__tests__/StoriesRow.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '../StoriesRow'`

- [ ] **Step 3: Create StoriesRow component**

Create `components/feed/StoriesRow.tsx`:

```typescript
import React from 'react';
import { ScrollView, View } from 'react-native';
import { colors } from '@/constants/theme';
import type { Story } from '@/lib/mockFeedData';
import { StoryItem } from './StoryItem';

type Props = {
  stories: Story[];
  onStoryPress?: (id: string) => void;
};

export function StoriesRow({ stories, onStoryPress }: Props) {
  return (
    <View style={{ backgroundColor: colors.surfaceContainerLow, paddingVertical: 12 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 8 }}
      >
        {stories.map((story) => (
          <StoryItem
            key={story.id}
            {...story}
            onPress={() => onStoryPress?.(story.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest components/feed/__tests__/StoriesRow.test.tsx --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/feed/StoriesRow.tsx components/feed/__tests__/StoriesRow.test.tsx
git commit -m "feat: add StoriesRow component"
```

---

## Task 5: PostCard Component

**Files:**
- Create: `components/feed/PostCard.tsx`
- Create: `components/feed/__tests__/PostCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/feed/__tests__/PostCard.test.tsx`:

```typescript
import React from 'react';
import renderer from 'react-test-renderer';
import { PostCard } from '../PostCard';

jest.mock('expo-image', () => ({ Image: 'Image' }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));

describe('PostCard', () => {
  it('renders with photo, username, likes, and caption', () => {
    const tree = renderer
      .create(
        <PostCard
          id="p1"
          username="ALEX_99"
          avatarUrl="https://i.pravatar.cc/150?img=5"
          timestamp="3 HOURS AGO"
          imageUrl="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800"
          likes={1200}
          caption="New personal record on the deadlift."
        />
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest components/feed/__tests__/PostCard.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '../PostCard'`

- [ ] **Step 3: Create PostCard component**

Create `components/feed/PostCard.tsx`:

```typescript
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PHOTO_HEIGHT = Math.round(SCREEN_WIDTH * (5 / 4)); // 4:5 aspect ratio

type Props = {
  id: string;
  username: string;
  avatarUrl: string;
  timestamp: string;
  imageUrl: string;
  likes: number;
  caption: string;
  onLikePress?: (id: string) => void;
};

function formatLikes(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function PostCard({
  id,
  username,
  avatarUrl,
  timestamp,
  imageUrl,
  likes,
  caption,
  onLikePress,
}: Props) {
  const [captionExpanded, setCaptionExpanded] = useState(false);

  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: '#2A2A2A' }}>
      {/* Photo + Floating Header */}
      <View style={{ width: SCREEN_WIDTH, height: PHOTO_HEIGHT }}>
        <Image
          source={{ uri: imageUrl }}
          style={{ width: SCREEN_WIDTH, height: PHOTO_HEIGHT }}
          contentFit="cover"
        />

        {/* Black → transparent gradient over top of photo */}
        <LinearGradient
          colors={['rgba(0,0,0,0.72)', 'transparent']}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 80,
          }}
        />

        {/* Avatar + username + timestamp floated over photo */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 16,
            height: 68,
          }}
        >
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: 36, height: 36, borderRadius: 18, marginRight: 12 }}
            contentFit="cover"
          />
          <View>
            <Text
              style={{
                color: colors.onSurface,
                fontSize: 14,
                fontWeight: '600',
                letterSpacing: 0.5,
              }}
            >
              {username}
            </Text>
            <Text style={{ color: colors.onSurfaceVariant, fontSize: 11 }}>
              {timestamp}
            </Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View
        style={{
          backgroundColor: colors.surface,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 16,
        }}
      >
        {/* Like button + count */}
        <TouchableOpacity
          onPress={() => onLikePress?.(id)}
          activeOpacity={0.7}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
        >
          <Text style={{ color: colors.onSurface, fontSize: 20, marginRight: 6 }}>♡</Text>
          <Text style={{ color: colors.onSurface, fontSize: 14, fontWeight: '500' }}>
            {formatLikes(likes)}
          </Text>
        </TouchableOpacity>

        {/* Caption with expand/collapse */}
        <TouchableOpacity
          onPress={() => setCaptionExpanded((v) => !v)}
          activeOpacity={0.9}
        >
          <Text
            numberOfLines={captionExpanded ? undefined : 2}
            style={{ color: colors.onSurface, fontSize: 14, lineHeight: 20 }}
          >
            {caption}
          </Text>
          {!captionExpanded && caption.length > 80 && (
            <Text style={{ color: colors.onSurfaceVariant, fontSize: 13, marginTop: 2 }}>
              more
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest components/feed/__tests__/PostCard.test.tsx --no-coverage
```

Expected: PASS (snapshot written)

- [ ] **Step 5: Commit**

```bash
git add components/feed/PostCard.tsx components/feed/__tests__/PostCard.test.tsx
git commit -m "feat: add PostCard component with gradient overlay header"
```

---

## Task 6: Rebuild Home Screen

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Write the failing test**

Create `app/(tabs)/__tests__/index.test.tsx`:

```typescript
import React from 'react';
import renderer from 'react-test-renderer';
import Home from '../index';

jest.mock('expo-image', () => ({ Image: 'Image' }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34 }),
}));

describe('Home screen', () => {
  it('renders without crashing', () => {
    const tree = renderer.create(<Home />).toJSON();
    expect(tree).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test**

```bash
npx jest "app/\(tabs\)/__tests__/index.test.tsx" --no-coverage
```

Expected: May PASS or FAIL with current generic home. Note result.

- [ ] **Step 3: Replace home screen with feed layout**

Replace full content of `app/(tabs)/index.tsx`:

```typescript
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PostCard } from '@/components/feed/PostCard';
import { StoriesRow } from '@/components/feed/StoriesRow';
import { colors } from '@/constants/theme';
import { MOCK_POSTS, MOCK_STORIES, type Post } from '@/lib/mockFeedData';

function FeedHeader() {
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
}

export default function Home() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {/* Sticky header above the FlatList */}
      <View style={{ paddingTop: insets.top, backgroundColor: colors.surface }}>
        <FeedHeader />
      </View>

      <FlatList
        data={MOCK_POSTS}
        keyExtractor={(item: Post) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        ListHeaderComponent={<StoriesRow stories={MOCK_STORIES} />}
        renderItem={({ item }: { item: Post }) => <PostCard {...item} />}
      />
    </View>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest "app/\(tabs\)/__tests__/index.test.tsx" --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/index.tsx" "app/(tabs)/__tests__/index.test.tsx"
git commit -m "feat: rebuild home screen as social feed with stories and post cards"
```

---

## Task 7: Rebuild Tab Bar + Placeholder Screens

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/audio.tsx`
- Create: `app/(tabs)/profile.tsx`
- Create: `app/(tabs)/create.tsx`

- [ ] **Step 1: Create placeholder Audio screen**

Create `app/(tabs)/audio.tsx`:

```typescript
import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

export default function Audio() {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: insets.bottom + 80,
      }}
    >
      <Text style={{ color: colors.onSurfaceVariant, fontSize: 16 }}>
        Audio — coming soon
      </Text>
    </View>
  );
}
```

- [ ] **Step 2: Create placeholder Profile screen**

Create `app/(tabs)/profile.tsx`:

```typescript
import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

export default function Profile() {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: insets.bottom + 80,
      }}
    >
      <Text style={{ color: colors.onSurfaceVariant, fontSize: 16 }}>
        Profile — coming soon
      </Text>
    </View>
  );
}
```

- [ ] **Step 3: Create placeholder Create Post screen**

Create `app/(tabs)/create.tsx`:

```typescript
import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

export default function Create() {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: insets.bottom + 80,
      }}
    >
      <Text style={{ color: colors.onSurfaceVariant, fontSize: 16 }}>
        Create Post — coming soon
      </Text>
    </View>
  );
}
```

- [ ] **Step 4: Replace tab layout**

Replace full content of `app/(tabs)/_layout.tsx`:

```typescript
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

type TabIconProps = {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
};

function TabIcon({ name, color }: TabIconProps) {
  return <Ionicons name={name} size={22} color={color} />;
}

type FabButtonProps = {
  onPress?: () => void;
  children?: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityState?: object;
  style?: object;
};

function FabButton({ onPress }: FabButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        top: -16,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOpacity: 0.45,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
      }}
    >
      <Ionicons name="add" size={28} color={colors.onPrimary} />
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: '#2A2A2A',
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => <TabIcon name="bar-chart-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarIcon: () => null,
          tabBarButton: (props) => <FabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="audio"
        options={{
          title: 'Audio',
          tabBarIcon: ({ color }) => <TabIcon name="musical-notes-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon name="person-outline" color={color} />,
        }}
      />
      {/* Keep wallet and settings as navigable routes but hidden from tab bar */}
      <Tabs.Screen name="wallet" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
```

- [ ] **Step 5: Start the app and verify visually**

```bash
npx expo start
```

Open on device/simulator and check:
- [ ] Home tab: header with menu icon + green TRACKOOO + bell with green badge dot
- [ ] Stories row: "ADD STORY" (dashed ring + `+`) followed by user avatars (green ring for unseen, grey for seen)
- [ ] Post cards: edge-to-edge photos at 4:5 ratio, floating username/timestamp over gradient, like count + caption below
- [ ] Tab bar: flat dark bar, HOME / STATS / green circle FAB / AUDIO / PROFILE
- [ ] FAB floats above bar with green glow shadow
- [ ] Tapping STATS shows past sessions list (existing activity screen)
- [ ] Tapping AUDIO / PROFILE shows "coming soon" placeholder
- [ ] Wallet and Settings tabs no longer visible in bar

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/_layout.tsx" "app/(tabs)/audio.tsx" "app/(tabs)/profile.tsx" "app/(tabs)/create.tsx"
git commit -m "feat: 5-tab bar with floating FAB and placeholder screens"
```
