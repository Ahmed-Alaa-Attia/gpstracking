import { colors } from '@/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React, { memo } from 'react';
import { View, TouchableOpacity } from 'react-native';

export const FeedHeader = memo(function FeedHeader() {
  return (
    <View className="flex-row items-center justify-between px-4 h-17 bg-background">
      <TouchableOpacity activeOpacity={0.8}>
        <Image
          source={{ uri: "https://i.pravatar.cc/150?img=11" }}
          style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.border || '#2A2A2A' }}
          contentFit="cover"
        />
      </TouchableOpacity>
      <Image
        source={require('@/assets/trackoo.png')}
        contentFit="contain"
        style={{ width: 120, height: 32 }}
      />
      <View>
        <Ionicons name="notifications-outline" size={24} color={colors.onSurface} />
        <View className="absolute top-0 right-0 w-2 h-2 rounded-full bg-primary" />
      </View>
    </View>
  );
});
