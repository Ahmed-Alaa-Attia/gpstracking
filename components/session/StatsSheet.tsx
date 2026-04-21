import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useMemo, useRef } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { colors } from '@/constants/theme';
import { formatDistance, formatDuration, formatPace, formatSpeed } from '@/lib/format';
import type { TrackerStatus } from '@/hooks/useLocationTracker';

interface Props {
  status: TrackerStatus;
  distanceMeters: number;
  durationSec: number;
  currentSpeedMps: number;
  avgSpeedMps: number;
  maxSpeedMps: number;
  paceSecPerKm: number | null;
  steps: number;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function StatsSheet(props: Props) {
  const ref = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['15%', '50%', '88%'], []);

  return (
    <BottomSheet
      ref={ref}
      index={1}
      snapPoints={snapPoints}
      handleIndicatorStyle={{ backgroundColor: colors.onSurfaceVariant }}
      backgroundStyle={{ backgroundColor: colors.surfaceContainerLow, borderRadius: 28 }}
    >
      <BottomSheetView style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
        <View className="flex-row justify-between mb-6">
          <Peek label="Distance" value={formatDistance(props.distanceMeters)} />
          <Peek label="Time" value={formatDuration(props.durationSec)} />
          <Peek label="Speed" value={formatSpeed(props.currentSpeedMps)} />
        </View>

        <View className="flex-row mb-6">
          <Stat label="Avg" value={formatSpeed(props.avgSpeedMps)} />
          <Stat label="Max" value={formatSpeed(props.maxSpeedMps)} />
          <Stat label="Pace" value={formatPace(props.paceSecPerKm)} />
          <Stat label="Steps" value={String(props.steps)} />
        </View>

        <View className="flex-row gap-3">
          {props.status === 'tracking' ? (
            <View className="flex-1"><Button label="Pause" onPress={props.onPause} /></View>
          ) : (
            <View className="flex-1"><Button label="Resume" onPress={props.onResume} /></View>
          )}
          <View className="flex-1"><Button label="Stop" onPress={props.onStop} /></View>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

function Peek({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-label-md text-on-surface-variant">{label}</Text>
      <Text className="text-headline-sm text-on-surface">{value}</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text className="text-label-md text-on-surface-variant">{label}</Text>
      <Text className="text-title-md text-on-surface">{value}</Text>
    </View>
  );
}
