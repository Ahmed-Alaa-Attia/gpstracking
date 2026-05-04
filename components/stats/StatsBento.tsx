import React, { memo } from 'react';
import { Text, View } from 'react-native';

type BentoCardProps = {
  label: string;
  value: string;
  unit: string;
};

function BentoCard({ label, value, unit }: BentoCardProps) {
  return (
    <View className="flex-1 bg-surface-container-low rounded-lg border border-outline-variant p-4">
      <Text className="text-on-surface-variant text-[13px] font-semibold tracking-[0.8px] mb-2">
        {label}
      </Text>
      <View className="flex-row items-end">
        <Text className="text-on-surface text-[50px] font-bold leading-[44px]">
          {value}
        </Text>
        <Text className="text-on-surface-variant text-xl font-medium ml-1 mb-1">
          {unit}
        </Text>
      </View>
    </View>
  );
}

type Props = {
  totalKm: number;
  activeDays: number;
};

export const StatsBento = memo(function StatsBento({ totalKm, activeDays }: Props) {
  return (
    <View className="flex-row px-0 gap-2 mt-10">
      <BentoCard label="TOTAL DISTANCE" value={totalKm.toFixed(1)} unit="km" />
      <BentoCard label="ACTIVE DAYS" value={String(activeDays)} unit="/7" />
    </View>
  );
});
