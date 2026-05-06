# Make a Post — Camera & Post Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full Instagram-style create flow — camera screen with Photo/Video/Story/Boomerang modes plus a caption-only post form — stubbed for Supabase upload in the next sprint.

**Architecture:** Two root-level Stack screens (`app/camera.tsx`, `app/post.tsx`) sit outside the tab navigator so they appear full-screen without the tab bar. The FAB button overrides its tab-press to `router.push('/camera')`. Media URI + type travel from camera to post as route params. `expo-camera` drives live preview, capture, and video recording; `expo-image-picker` (already installed) handles gallery access.

**Tech Stack:** Expo SDK 54, expo-camera ~16, expo-image-picker ~17 (installed), NativeWind v5 (className styling), Expo Router v6, React Native Reanimated ~4, TypeScript.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `app.json` | Add camera / mic / photo-library permissions |
| Modify | `app/_layout.tsx` | Register `camera` + `post` in root Stack |
| Modify | `app/(tabs)/_layout.tsx` | Override FAB `onPress` → `router.push('/camera')` |
| Create | `components/create/ModeSelector.tsx` | Pill tabs: Photo / Video / Story / Boomerang |
| Create | `components/create/CaptureButton.tsx` | Animated capture / record button |
| Create | `components/create/StoryConfirmOverlay.tsx` | Instagram-style story confirmation modal |
| Create | `app/camera.tsx` | Full-screen camera screen |
| Create | `app/post.tsx` | Caption form + Post Now button |

---

## Task 1: Install expo-camera and configure permissions

**Files:**
- Modify: `app.json`

- [ ] **Step 1: Install expo-camera**

```bash
npx expo install expo-camera
```

Expected: `expo-camera` added to `package.json` dependencies.

- [ ] **Step 2: Add permissions to app.json**

In `app.json`, under `expo.ios.infoPlist`, add:
```json
"NSCameraUsageDescription": "Trackooo uses your camera to create posts and stories.",
"NSMicrophoneUsageDescription": "Trackooo uses your microphone to record videos for posts."
```

Under `expo.android.permissions` array, append:
```json
"CAMERA",
"RECORD_AUDIO",
"READ_MEDIA_IMAGES",
"READ_MEDIA_VIDEO"
```

Under `expo.plugins` array, append:
```json
[
  "expo-camera",
  {
    "cameraPermission": "Trackooo uses your camera to create posts and stories.",
    "microphonePermission": "Trackooo uses your microphone to record videos for posts.",
    "recordAudioAndroid": true
  }
]
```

- [ ] **Step 3: Verify**

Run `npx expo start`. App starts without errors. No camera prompt yet.

- [ ] **Step 4: Commit**

```bash
git add app.json package.json
git commit -m "feat(create): install expo-camera and configure permissions"
```

---

## Task 2: Register camera and post screens in root Stack

**Files:**
- Modify: `app/_layout.tsx` (after line 54 — the `session/[id]` entry)

- [ ] **Step 1: Add Stack.Screen entries**

Inside the `<Stack>` in `app/_layout.tsx`, after the `session/[id]` screen, add:

```tsx
<Stack.Screen
  name="camera"
  options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', headerShown: false }}
/>
<Stack.Screen
  name="post"
  options={{ presentation: 'card', animation: 'slide_from_right', headerShown: false }}
/>
```

- [ ] **Step 2: Verify**

Run `npx expo start`. App loads normally — no visible change yet.

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat(create): register camera and post screens in root stack"
```

---

## Task 3: Wire FAB button to open /camera

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Import useRouter**

Add to the existing imports at the top of `app/(tabs)/_layout.tsx`:
```tsx
import { Tabs, useRouter } from 'expo-router';
```

(Replace the existing `import { Tabs } from 'expo-router'`.)

- [ ] **Step 2: Instantiate router inside TabLayout**

Inside the `TabLayout` component, directly after `const insets = useSafeAreaInsets();`, add:
```tsx
const router = useRouter();
```

- [ ] **Step 3: Override the create tab's tabBarButton**

Find the `Tabs.Screen` with `name="create"` and replace its `tabBarButton` line:
```tsx
tabBarButton: (props) => (
  <FabButton {...props} onPress={() => router.push('/camera' as any)} />
),
```

- [ ] **Step 4: Verify**

Tap the FAB. You'll get "No route named 'camera'" — expected until `app/camera.tsx` exists.

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/_layout.tsx"
git commit -m "feat(create): wire FAB button to open camera screen"
```

---

## Task 4: Build ModeSelector component

**Files:**
- Create: `components/create/ModeSelector.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { fontFamily } from '@/constants/fonts';
import React from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';

export type CameraMode = 'photo' | 'video' | 'story' | 'boomerang';

const MODES: { key: CameraMode; label: string }[] = [
  { key: 'photo', label: 'Photo' },
  { key: 'video', label: 'Video' },
  { key: 'story', label: 'Story' },
  { key: 'boomerang', label: 'Boomerang' },
];

interface ModeSelectorProps {
  selected: CameraMode;
  onSelect: (mode: CameraMode) => void;
}

export function ModeSelector({ selected, onSelect }: ModeSelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 1,
      }}
    >
      {MODES.map(({ key, label }) => (
        <TouchableOpacity
          key={key}
          onPress={() => onSelect(key)}
          activeOpacity={0.8}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: selected === key ? '#b9f600' : 'rgba(0,0,0,0.5)',
          }}
        >
          <Text
            style={{
              fontFamily: fontFamily.semibold,
              fontSize: 11,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: selected === key ? '#263500' : '#ffffff',
            }}
          >
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/create/ModeSelector.tsx
git commit -m "feat(create): add ModeSelector pill tabs component"
```

---

## Task 5: Build CaptureButton component

**Files:**
- Create: `components/create/CaptureButton.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { CameraMode } from '@/components/create/ModeSelector';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface CaptureButtonProps {
  mode: CameraMode;
  isRecording: boolean;
  onPress: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
}

export function CaptureButton({
  mode,
  isRecording,
  onPress,
  onPressIn,
  onPressOut,
}: CaptureButtonProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15 });
    onPressIn?.();
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
    onPressOut?.();
  };

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          borderWidth: 4,
          borderColor: 'white',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {mode === 'video' ? (
          <View
            style={
              isRecording
                ? { width: 32, height: 32, borderRadius: 6, backgroundColor: '#ef4444' }
                : { width: 56, height: 56, borderRadius: 28, backgroundColor: 'white' }
            }
          />
        ) : (
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'white' }} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/create/CaptureButton.tsx
git commit -m "feat(create): add animated CaptureButton component"
```

---

## Task 6: Build camera.tsx static UI shell

**Files:**
- Create: `app/camera.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { CaptureButton } from '@/components/create/CaptureButton';
import { CameraMode, ModeSelector } from '@/components/create/ModeSelector';
import { fontFamily } from '@/constants/fonts';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CameraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<CameraMode>('photo');
  const [flash, setFlash] = useState<'on' | 'off'>('off');
  const [isRecording, setIsRecording] = useState(false);

  const handleCapture = () => {
    // wired in later tasks
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      {/* Camera preview placeholder */}
      <View style={{ flex: 1, backgroundColor: '#18181b' }} />

      {/* Top bar */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: insets.top + 8,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFlash((f) => (f === 'off' ? 'on' : 'off'))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={flash === 'on' ? 'flash' : 'flash-off'}
            size={24}
            color="white"
          />
        </TouchableOpacity>
      </View>

      {/* Bottom controls */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: insets.bottom + 16,
          gap: 20,
        }}
      >
        {/* Control row: gallery | capture | flip */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 40,
          }}
        >
          {/* Gallery */}
          <TouchableOpacity
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="images-outline" size={24} color="white" />
          </TouchableOpacity>

          {/* Capture */}
          <CaptureButton
            mode={mode}
            isRecording={isRecording}
            onPress={handleCapture}
          />

          {/* Flip */}
          <TouchableOpacity
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="camera-reverse-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Mode selector — BELOW the control row */}
        <ModeSelector selected={mode} onSelect={setMode} />
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Verify**

Tap the FAB. Camera screen opens (dark placeholder, all controls visible). X closes. Flash icon toggles. Flip icon tappable. Mode pills switch active state.

- [ ] **Step 3: Commit**

```bash
git add app/camera.tsx
git commit -m "feat(create): add camera screen static UI shell"
```

---

## Task 7: Wire CameraView + permissions

**Files:**
- Modify: `app/camera.tsx`

- [ ] **Step 1: Add imports**

Add to the top of `app/camera.tsx`:
```tsx
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useEffect, useRef } from 'react';
```

- [ ] **Step 2: Add camera state inside CameraScreen**

After the existing `useState` calls:
```tsx
const [cameraPermission, requestCameraPermission] = useCameraPermissions();
const [micPermission, requestMicPermission] = useMicrophonePermissions();
const cameraRef = useRef<CameraView>(null);
const [facing, setFacing] = useState<'front' | 'back'>('front');
```

- [ ] **Step 3: Request permissions on mount**

Add inside `CameraScreen`, before the return:
```tsx
useEffect(() => {
  (async () => {
    if (!cameraPermission?.granted) await requestCameraPermission();
    if (!micPermission?.granted) await requestMicPermission();
  })();
}, []);
```

- [ ] **Step 4: Replace the preview placeholder**

Replace `<View style={{ flex: 1, backgroundColor: '#18181b' }} />` with:
```tsx
{cameraPermission?.granted ? (
  <CameraView
    ref={cameraRef}
    style={{ flex: 1 }}
    facing={facing}
    flash={flash}
  />
) : (
  <View style={{ flex: 1, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: fontFamily.regular, fontSize: 14 }}>
      Camera permission required
    </Text>
  </View>
)}
```

- [ ] **Step 5: Verify**

Open camera screen. Permission dialog appears. After granting, live front-facing camera preview is visible.

- [ ] **Step 6: Commit**

```bash
git add app/camera.tsx
git commit -m "feat(create): wire CameraView with permission handling"
```

---

## Task 8: Wire flash toggle and camera flip

**Files:**
- Modify: `app/camera.tsx`

- [ ] **Step 1: Wire the flip button's onPress**

Find the flip `TouchableOpacity` and add `onPress`:
```tsx
onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
```

The `facing` state already feeds into `<CameraView facing={facing} />` from Task 7.

- [ ] **Step 2: Verify**

Tap flip icon → camera switches front/back. Tap flash icon → icon toggles (flash activates on next photo capture).

- [ ] **Step 3: Commit**

```bash
git add app/camera.tsx
git commit -m "feat(create): wire camera flip and flash toggle"
```

---

## Task 9: Wire gallery picker

**Files:**
- Modify: `app/camera.tsx`

- [ ] **Step 1: Add gallery import**

Add to imports at the top of `app/camera.tsx`:
```tsx
import * as ImagePicker from 'expo-image-picker';
```

- [ ] **Step 2: Add openGallery function inside CameraScreen**

```tsx
const openGallery = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    quality: 0.9,
    allowsEditing: false,
  });
  if (!result.canceled && result.assets.length > 0) {
    const asset = result.assets[0];
    router.push({
      pathname: '/post' as any,
      params: { uri: asset.uri, mediaType: asset.type ?? 'image' },
    });
  }
};
```

- [ ] **Step 3: Wire the gallery button**

Find the gallery `TouchableOpacity` and add:
```tsx
onPress={openGallery}
```

- [ ] **Step 4: Verify**

Tap the gallery icon. Photo library opens. Select an image. App navigates toward `/post` (will error until post.tsx exists — that's expected).

- [ ] **Step 5: Commit**

```bash
git add app/camera.tsx
git commit -m "feat(create): wire gallery picker"
```

---

## Task 10: Implement Photo mode — capture and navigate to post

**Files:**
- Modify: `app/camera.tsx`

- [ ] **Step 1: Add capturePhoto function inside CameraScreen**

```tsx
const capturePhoto = async () => {
  if (!cameraRef.current) return;
  const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
  if (photo?.uri) {
    router.push({
      pathname: '/post' as any,
      params: { uri: photo.uri, mediaType: 'image' },
    });
  }
};
```

- [ ] **Step 2: Update handleCapture**

Replace the empty `handleCapture`:
```tsx
const handleCapture = () => {
  if (mode === 'photo') capturePhoto();
  // video, story, boomerang handled in later tasks
};
```

- [ ] **Step 3: Verify**

Switch to Photo mode. Tap capture. Photo taken and app navigates toward `/post` (will error until Task 14).

- [ ] **Step 4: Commit**

```bash
git add app/camera.tsx
git commit -m "feat(create): implement photo capture"
```

---

## Task 11: Implement Video mode — tap to start/stop recording

**Files:**
- Modify: `app/camera.tsx`

- [ ] **Step 1: Add video recording functions inside CameraScreen**

```tsx
const startVideoRecording = async () => {
  if (!cameraRef.current || isRecording) return;
  setIsRecording(true);
  try {
    const video = await cameraRef.current.recordAsync();
    if (video?.uri) {
      router.push({
        pathname: '/post' as any,
        params: { uri: video.uri, mediaType: 'video' },
      });
    }
  } catch {
    setIsRecording(false);
  }
};

const stopVideoRecording = () => {
  cameraRef.current?.stopRecording();
  setIsRecording(false);
};
```

- [ ] **Step 2: Update CameraView to set mode for video**

Update the `<CameraView>` element to include the `mode` prop:
```tsx
<CameraView
  ref={cameraRef}
  style={{ flex: 1 }}
  facing={facing}
  flash={flash}
  mode={mode === 'video' ? 'video' : 'picture'}
/>
```

- [ ] **Step 3: Update CaptureButton onPress for video mode**

Replace the `<CaptureButton>` JSX:
```tsx
<CaptureButton
  mode={mode}
  isRecording={isRecording}
  onPress={
    mode === 'video'
      ? isRecording
        ? stopVideoRecording
        : startVideoRecording
      : handleCapture
  }
/>
```

- [ ] **Step 4: Verify**

Switch to Video mode. Tap capture — recording starts (button turns red square). Tap again — recording stops and navigates toward `/post`.

- [ ] **Step 5: Commit**

```bash
git add app/camera.tsx
git commit -m "feat(create): implement video recording mode"
```

---

## Task 12: Implement Story mode — share confirmation overlay

**Files:**
- Create: `components/create/StoryConfirmOverlay.tsx`
- Modify: `app/camera.tsx`

- [ ] **Step 1: Create StoryConfirmOverlay**

```tsx
import { fontFamily } from '@/constants/fonts';
import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

interface StoryConfirmOverlayProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function StoryConfirmOverlay({ visible, onConfirm, onCancel }: StoryConfirmOverlayProps) {
  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 48, paddingHorizontal: 24 }}>
        <View style={{ width: '100%', backgroundColor: '#1a1a1a', borderRadius: 24, padding: 24, gap: 16 }}>
          <Text style={{ fontFamily: fontFamily.bold, fontSize: 20, color: 'white', textAlign: 'center' }}>
            Share to Your Story?
          </Text>
          <Text style={{ fontFamily: fontFamily.regular, fontSize: 14, color: '#a3a3a3', textAlign: 'center' }}>
            This will be visible to your followers for 24 hours.
          </Text>
          <TouchableOpacity
            onPress={onConfirm}
            style={{ backgroundColor: '#b9f600', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
          >
            <Text style={{ fontFamily: fontFamily.semibold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: '#263500' }}>
              Share Now
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel} style={{ paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ fontFamily: fontFamily.regular, fontSize: 14, color: '#a3a3a3' }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 2: Add story state and functions to camera.tsx**

Add import:
```tsx
import { StoryConfirmOverlay } from '@/components/create/StoryConfirmOverlay';
```

Add state inside `CameraScreen`:
```tsx
const [storyOverlayVisible, setStoryOverlayVisible] = useState(false);
const [storyUri, setStoryUri] = useState<string | null>(null);
```

Add functions:
```tsx
const handleStory = async () => {
  if (!cameraRef.current) return;
  const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
  if (photo?.uri) {
    setStoryUri(photo.uri);
    setStoryOverlayVisible(true);
  }
};

const confirmStory = () => {
  console.log('[Story] posting story with URI:', storyUri);
  setStoryOverlayVisible(false);
  setStoryUri(null);
  router.back();
};
```

- [ ] **Step 3: Update handleCapture and add overlay to JSX**

Update `handleCapture`:
```tsx
const handleCapture = () => {
  if (mode === 'photo') capturePhoto();
  if (mode === 'story') handleStory();
  if (mode === 'boomerang') handleBoomerang(); // Task 13
};
```

Inside the root `<View>` of camera.tsx (before its closing tag), add:
```tsx
<StoryConfirmOverlay
  visible={storyOverlayVisible}
  onConfirm={confirmStory}
  onCancel={() => { setStoryOverlayVisible(false); setStoryUri(null); }}
/>
```

- [ ] **Step 4: Verify**

Switch to Story mode. Tap capture. Confirmation overlay appears. Tap "Share Now" — console logs and navigates back to feed. Tap "Cancel" — overlay closes, stays on camera.

- [ ] **Step 5: Commit**

```bash
git add components/create/StoryConfirmOverlay.tsx app/camera.tsx
git commit -m "feat(create): implement story mode with confirmation overlay"
```

---

## Task 13: Implement Boomerang — coming soon overlay

**Files:**
- Modify: `app/camera.tsx`

- [ ] **Step 1: Add coming-soon state**

Add inside `CameraScreen`:
```tsx
const [showComingSoon, setShowComingSoon] = useState(false);
```

- [ ] **Step 2: Add handleBoomerang function**

```tsx
const handleBoomerang = () => {
  setShowComingSoon(true);
  setTimeout(() => setShowComingSoon(false), 2000);
};
```

- [ ] **Step 3: Add the overlay JSX**

Inside the root `<View>` of camera.tsx (before its closing tag), add:
```tsx
{showComingSoon && (
  <View
    style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
    }}
  >
    <View style={{ backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 }}>
      <Text style={{ fontFamily: fontFamily.semibold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: 'white' }}>
        Boomerang — Coming Soon
      </Text>
    </View>
  </View>
)}
```

- [ ] **Step 4: Verify**

Switch to Boomerang mode. Tap capture. Toast appears for 2 seconds then disappears.

- [ ] **Step 5: Commit**

```bash
git add app/camera.tsx
git commit -m "feat(create): add Boomerang coming-soon overlay"
```

---

## Task 14: Build post.tsx — caption form

**Files:**
- Create: `app/post.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { fontFamily } from '@/constants/fonts';
import { colors } from '@/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { uri, mediaType } = useLocalSearchParams<{ uri: string; mediaType: string }>();
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (posting) return;
    setPosting(true);
    // Supabase upload wired in next sprint
    console.log('[Post] uri:', uri, 'mediaType:', mediaType, 'caption:', caption);
    setPosting(false);
    router.dismissAll();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Top bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: insets.top + 8,
          paddingBottom: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>

        {/* Pill Post button */}
        <TouchableOpacity
          onPress={handlePost}
          disabled={posting}
          style={{
            backgroundColor: colors.primary,
            paddingHorizontal: 20,
            paddingVertical: 8,
            borderRadius: 999,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamily.semibold,
              fontSize: 12,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: colors.onPrimary,
            }}
          >
            {posting ? 'Posting…' : 'Post'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Full-width image preview — 3:4 aspect ratio */}
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: '100%', aspectRatio: 3 / 4 }}
            contentFit="cover"
          />
        ) : (
          <View style={{ width: '100%', aspectRatio: 3 / 4, backgroundColor: colors.surface }} />
        )}

        {/* Caption input */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Write a caption…"
            placeholderTextColor={colors.onSurfaceVariant}
            multiline
            autoFocus
            style={{
              fontFamily: fontFamily.regular,
              fontSize: 16,
              color: 'white',
              minHeight: 80,
            }}
          />
        </View>
      </ScrollView>

      {/* Post Now — fixed above keyboard */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: insets.bottom + 16,
        }}
      >
        <TouchableOpacity
          onPress={handlePost}
          disabled={posting}
          style={{
            backgroundColor: colors.primary,
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: 'center',
            shadowColor: colors.primary,
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamily.semibold,
              fontSize: 13,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: colors.onPrimary,
            }}
          >
            {posting ? 'Posting…' : 'Post Now'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 2: Verify the complete flow**

Run `npx expo start` and test each path:

1. Tap FAB → camera opens full-screen, front camera live.
2. Flash icon toggles on/off.
3. Flip icon switches front/back camera.
4. Gallery icon → photo library → select image → post form with image preview.
5. Photo mode: tap capture → post form, image shows, caption autofocuses.
6. Video mode: tap to start (button → red square), tap to stop → post form with video URI.
7. Story mode: tap → overlay appears → "Share Now" → logs + returns to feed. "Cancel" → stays on camera.
8. Boomerang mode: tap → "Coming Soon" toast 2 seconds.
9. Post form: type caption → "Post" pill or "Post Now" → console log → returns to feed.
10. Back chevron on post form → returns to camera.

- [ ] **Step 3: Commit**

```bash
git add app/post.tsx
git commit -m "feat(create): build post form with caption and post buttons"
```
