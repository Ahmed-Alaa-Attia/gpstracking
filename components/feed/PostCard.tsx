import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useCallback, useState } from "react";
import { Dimensions, Text, TouchableOpacity, View } from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PHOTO_HEIGHT = Math.round(SCREEN_WIDTH * (3 / 4)); // 3:4 aspect ratio

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

export const PostCard = memo(function PostCard({
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
  const handleLike = useCallback(() => onLikePress?.(id), [id, onLikePress]);
  const toggleCaption = useCallback(() => setCaptionExpanded((v) => !v), []);

  return (
    <View className="border-b border-[#2A2A2A]">
      {/* Photo + Floating Header */}
      <View style={{ width: SCREEN_WIDTH, height: PHOTO_HEIGHT }}>
        <Image
          source={{ uri: imageUrl }}
          style={{ width: SCREEN_WIDTH, height: PHOTO_HEIGHT }}
          contentFit="cover"
        />

        {/* Black → transparent gradient over top of photo */}
        <LinearGradient
          colors={["rgba(0,0,0,0.85)", "transparent"]}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 120,
          }}
        />

        {/* Avatar + username + timestamp floated over photo */}
        <View className="absolute top-0 left-0 right-0 flex-row items-center px-4 pt-4 h-[68px]">
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12, borderColor: "#000000", borderWidth: 2 }}
            contentFit="cover"
          />
          <View>
            <Text className="text-on-surface text-sm font-semibold tracking-[0.5px]">
              {username}
            </Text>
            <Text className="text-on-surface-variant text-[11px] font-semibold">
              {timestamp}
            </Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View className="bg-surface px-4 pt-3 pb-4">
        {/* Like button + count */}
        <TouchableOpacity
          onPress={handleLike}
          activeOpacity={0.7}
          className="flex-row items-center mb-2"
        >
          <Text className="text-on-surface text-xl mr-1.5">♡</Text>
          <Text className="text-on-surface text-sm font-medium">
            {formatLikes(likes)}
          </Text>
        </TouchableOpacity>

        {/* Caption with expand/collapse */}
        <TouchableOpacity onPress={toggleCaption} activeOpacity={0.9}>
          <Text
            numberOfLines={captionExpanded ? undefined : 2}
            className="text-on-surface text-sm leading-5"
          >
            {caption}

            {!captionExpanded && caption.length > 80 && (
              <Text className="text-on-surface-variant text-[13px] mt-0.5">
                more...
              </Text>
            )}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});
