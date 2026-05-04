import { colors } from "@/constants/theme";
import { Image } from "expo-image";
import React, { memo } from "react";
import { Text, TouchableOpacity, View } from "react-native";

type Props = {
  id: string;
  username: string;
  avatarUrl: string;
  seen: boolean;
  isOwn: boolean;
  onPress?: () => void;
};

export const StoryItem = memo(function StoryItem({
  username,
  avatarUrl,
  seen,
  isOwn,
  onPress,
}: Props) {
  const ringColor = seen ? "#444444" : colors.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="items-center w-[86px]"
    >
      {/* Ring */}
      <View
        className="w-[78px] h-[78px] rounded-[39px] border-2 items-center justify-center mb-1.5"
        style={{
          borderColor: isOwn ? colors.primary : ringColor,
          borderStyle: isOwn ? "dashed" : "solid",
        }}
      >
        {isOwn ? (
          <View className="w-[70px] h-[70px] rounded-[35px] bg-surface-container-high items-center justify-center">
            <Text className="text-primary text-[30px] leading-[34px]">
              +
            </Text>
          </View>
        ) : (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: 70, height: 70, borderRadius: 35 }}
            contentFit="cover"
          />
        )}
      </View>

      {/* Label */}
      <Text
        numberOfLines={1}
        className={`text-xs font-semibold tracking-[0.5px] max-w-[82px] text-center ${isOwn ? 'text-primary' : 'text-on-surface'}`}
      >
        {username.toUpperCase()}
      </Text>
    </TouchableOpacity>
  );
});
