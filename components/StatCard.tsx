import React from 'react';
import { Text, View } from 'react-native';

interface StatCardProps {
  label: string;
  value: string;
  unit: string;
  className?: string; // Add className prop
}

export const StatCard = ({ label, value, unit, className }: StatCardProps) => (
  <View
    className={`bg-surface-container rounded-[20px] p-5 flex-1 mr-3 border border-surface-container-high ${className}`}
  >
    <Text className="text-label-md text-on-surface-variant !text-[10px]">
      {label}
    </Text>
    <View className="flex-row items-baseline mt-2">
      <Text className="text-headline-sm text-on-surface font-bold">
        {value}
      </Text>
      <Text className="text-body-md text-on-surface-variant ml-1 !text-[12px]">
        {unit}
      </Text>
    </View>
  </View>
);
