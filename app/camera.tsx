import { CaptureButton } from '@/components/create/CaptureButton';
import { CameraMode, ModeSelector } from '@/components/create/ModeSelector';
import { StoryConfirmOverlay } from '@/components/create/StoryConfirmOverlay';
import { fontFamily } from '@/constants/fonts';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { pendingPost } from '@/lib/pendingPost';
import React, { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CameraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<CameraMode>('photo');
  const [flash, setFlash] = useState<'on' | 'off'>('off');
  const [isRecording, setIsRecording] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [storyOverlayVisible, setStoryOverlayVisible] = useState(false);
  const [storyUri, setStoryUri] = useState<string | null>(null);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    (async () => {
      if (!cameraPermission?.granted) await requestCameraPermission();
      if (!micPermission?.granted) await requestMicPermission();
    })();
  }, []);

  const goToPost = (uri: string, mediaType: 'image' | 'video') => {
    pendingPost.uri = uri;
    pendingPost.mediaType = mediaType;
    console.log('[Camera] navigating to /post with', mediaType, uri.slice(-30));
    // Defer navigation to the next tick so the camera's async work fully settles
    setTimeout(() => {
      router.push('/post' as any);
    }, 50);
  };

  const openGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.9,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        goToPost(asset.uri, asset.type === 'video' ? 'video' : 'image');
      }
    } catch (e) {
      console.error('[Camera] openGallery error:', e);
    }
  };

  const capturePhoto = async () => {
    if (isCapturing) return;
    try {
      if (!cameraRef.current) {
        console.warn('[Camera] capturePhoto: ref is null');
        return;
      }
      setIsCapturing(true);
      // skipProcessing helps avoid iOS freezing on some devices by returning the raw buffer faster
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, skipProcessing: true });
      console.log('[Camera] photo captured:', photo?.uri);
      if (photo?.uri) {
        goToPost(photo.uri, 'image');
      }
    } catch (e) {
      console.error('[Camera] capturePhoto error:', e);
    } finally {
      setIsCapturing(false);
    }
  };

  const startVideoRecording = async () => {
    if (!cameraRef.current || isRecording) return;
    setIsRecording(true);
    try {
      const video = await cameraRef.current.recordAsync();
      if (video?.uri) {
        goToPost(video.uri, 'video');
      }
    } catch (e) {
      console.error('[Camera] startVideoRecording error:', e);
      setIsRecording(false);
    }
  };

  const stopVideoRecording = () => {
    cameraRef.current?.stopRecording();
    setIsRecording(false);
  };

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

  const handleBoomerang = () => {
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 2000);
  };

  const handleCapture = () => {
    if (mode === 'photo') capturePhoto();
    if (mode === 'story') handleStory();
    if (mode === 'boomerang') handleBoomerang();
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      {cameraPermission?.granted ? (
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing={facing}
          flash={flash}
          mode={mode === 'video' ? 'video' : 'picture'}
        />
      ) : (
        <View style={{ flex: 1, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center' }}>
          {!cameraPermission?.granted && (
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: fontFamily.regular, fontSize: 14 }}>
              Camera permission required
            </Text>
          )}
        </View>
      )}

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
            onPress={openGallery}
          >
            <Ionicons name="images-outline" size={24} color="white" />
          </TouchableOpacity>

          {/* Capture */}
          <CaptureButton
            mode={mode}
            isRecording={isRecording}
            onPress={
              isCapturing 
                ? () => {} 
                : mode === 'video'
                  ? isRecording
                    ? stopVideoRecording
                    : startVideoRecording
                  : handleCapture
            }
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
            onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
          >
            <Ionicons name="camera-reverse-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Mode selector — BELOW the control row */}
        <ModeSelector selected={mode} onSelect={setMode} />
      </View>

      <StoryConfirmOverlay
        visible={storyOverlayVisible}
        onConfirm={confirmStory}
        onCancel={() => { setStoryOverlayVisible(false); setStoryUri(null); }}
      />

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
    </View>
  );
}
