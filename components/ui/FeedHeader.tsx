import { colors } from '@/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { Text, View } from 'react-native';

export const FeedHeader = memo(function FeedHeader() {
  return (
    <View className="flex-row items-center justify-between px-4 h-17 bg-background">
      <Ionicons name="menu" size={24} color={colors.onSurface} />
      <Text className="text-primary text-2xl font-extrabold tracking-tight">
        TRACKOOO
      </Text>
      <View>
        <Ionicons name="notifications-outline" size={24} color={colors.onSurface} />
        <View className="absolute top-0 right-0 w-2 h-2 rounded-full bg-primary" />
      </View>
    </View>
  );
});
