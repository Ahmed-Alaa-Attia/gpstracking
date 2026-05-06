import { fontFamily } from '@/constants/fonts';
import { colors } from '@/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { pendingPost } from '@/lib/pendingPost';
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
  const { uri, mediaType } = pendingPost;
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Set up video player for video previews
  const videoPlayer = useVideoPlayer(mediaType === 'video' && uri ? uri : null, (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

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
      keyboardVerticalOffset={0}
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
          borderBottomWidth: 1,
          borderBottomColor: colors.outlineVariant,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>

        <Text
          style={{
            fontFamily: fontFamily.semibold,
            fontSize: 16,
            color: 'white',
          }}
        >
          New Post
        </Text>

        {/* Pill Post button */}
        <TouchableOpacity
          onPress={handlePost}
          disabled={posting}
          style={{
            backgroundColor: posting ? colors.surfaceBright : colors.primary,
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
              color: posting ? colors.onSurfaceVariant : colors.onPrimary,
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
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* Caption row — thumbnail + input side by side (Instagram-style) */}
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: 16,
            paddingVertical: 16,
            gap: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.outlineVariant,
          }}
        >
          {/* Thumbnail */}
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: colors.surface,
            }}
          >
            {uri && mediaType === 'video' ? (
              <VideoView
                player={videoPlayer}
                style={{ width: 80, height: 80 }}
                nativeControls={false}
                contentFit="cover"
              />
            ) : uri ? (
              <Image
                source={{ uri }}
                style={{ width: 80, height: 80 }}
                contentFit="cover"
              />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="image-outline" size={28} color={colors.onSurfaceVariant} />
              </View>
            )}

            {/* Video badge */}
            {mediaType === 'video' && (
              <View
                style={{
                  position: 'absolute',
                  bottom: 4,
                  right: 4,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  borderRadius: 4,
                  paddingHorizontal: 4,
                  paddingVertical: 2,
                }}
              >
                <Ionicons name="videocam" size={12} color="white" />
              </View>
            )}
          </View>

          {/* Caption input */}
          <TextInput
            ref={inputRef}
            value={caption}
            onChangeText={setCaption}
            placeholder="Write a caption…"
            placeholderTextColor={colors.onSurfaceVariant}
            multiline
            autoFocus
            style={{
              flex: 1,
              fontFamily: fontFamily.regular,
              fontSize: 16,
              color: 'white',
              textAlignVertical: 'top',
              minHeight: 80,
              paddingTop: 0,
            }}
          />
        </View>

        {/* Larger preview below */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}>
          {uri && mediaType === 'video' ? (
            <View style={{ borderRadius: 16, overflow: 'hidden' }}>
              <VideoView
                player={videoPlayer}
                style={{ width: '100%', aspectRatio: 4 / 5 }}
                nativeControls={true}
                contentFit="cover"
              />
            </View>
          ) : uri ? (
            <Image
              source={{ uri }}
              style={{ width: '100%', aspectRatio: 4 / 5, borderRadius: 16 }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{
                width: '100%',
                aspectRatio: 4 / 5,
                backgroundColor: colors.surface,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="image-outline" size={48} color={colors.onSurfaceVariant} />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Post Now — fixed above keyboard */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          borderTopWidth: 1,
          borderTopColor: colors.outlineVariant,
        }}
      >
        <TouchableOpacity
          onPress={handlePost}
          disabled={posting}
          activeOpacity={0.85}
          style={{
            backgroundColor: posting ? colors.surfaceBright : colors.primary,
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: 'center',
            shadowColor: colors.primary,
            shadowOpacity: posting ? 0 : 0.3,
            shadowRadius: 12,
            elevation: posting ? 0 : 6,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamily.semibold,
              fontSize: 13,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: posting ? colors.onSurfaceVariant : colors.onPrimary,
            }}
          >
            {posting ? 'Posting…' : 'Post Now'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
