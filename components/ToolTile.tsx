import React from 'react';
import { Image, Pressable, Text, ImageSourcePropType } from 'react-native';

interface ToolTileProps {
  icon: ImageSourcePropType;
  label: string;
  onPress: () => void;
  className?: string; // Add className prop
}

export const ToolTile = ({ icon, label, onPress, className }: ToolTileProps) => (
  <Pressable
    onPress={onPress}
    className={`bg-surface-container-low rounded-3xl p-4 w-[31%] aspect-square items-center justify-center border border-surface-container-high active:border-primary active:opacity-90 ${className}`}
  >
    <Image
      source={icon}
      className="w-6 h-6 tint-primary mb-2"
      resizeMode="contain"
    />
    <Text className="text-label-md text-on-surface !text-[9px]">
      {label}
    </Text>
  </Pressable>
);
