import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';
import { formatDistance, formatDuration, formatPace, formatSpeed } from '@/lib/format';
import type { SessionDoc, SessionType } from '@/lib/sessions';
import { formatSessionDate, getSessionName } from '@/lib/sessionUtils';
import { RouteThumbnail } from './RouteThumbnail';

const TYPE_ICON: Record<SessionType, React.ComponentProps<typeof Ionicons>['name']> = {
  run: 'walk',
  bike: 'bicycle',
  drive: 'car',
  generic: 'fitness',
};

const TYPE_LABEL: Record<SessionType, string> = {
  run: 'RUN',
  bike: 'RIDE',
  drive: 'DRIVE',
  generic: 'WORKOUT',
};

type StatColProps = { label: string; value: string };

function StatCol({ label, value }: StatColProps) {
  return (
    <View className="flex-1">
      <Text className="text-on-surface-variant text-[11px] font-semibold tracking-[0.8px] mb-1">
        {label}
      </Text>
      <Text className="text-on-surface text-base font-semibold">
        {value}
      </Text>
    </View>
  );
}

type Props = {
  session: SessionDoc;
  cardWidth: number;
  onPress: (id: string) => void;
};

export const SessionCard = memo(function SessionCard({
  session,
  cardWidth,
  onPress,
}: Props) {
  const handlePress = useCallback(() => onPress(session.id), [session.id, onPress]);
  const type = session.type ?? 'generic';
  const isSpeedBased = type === 'bike' || type === 'drive';
  const col2Label = isSpeedBased ? 'AVG SPEED' : 'AVG PACE';
  const col2Value = isSpeedBased
    ? formatSpeed(session.avgSpeedMps)
    : formatPace(session.paceSecPerKm);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      className="bg-surface-container-low rounded-xl border border-outline-variant overflow-hidden"
    >
      {/* Thumbnail + badge + title overlay */}
      <View>
        <RouteThumbnail points={session.points} width={cardWidth} height={280} />
        
        {/* Gradient glass effect at the bottom of the map */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.9)']}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 120,
            justifyContent: 'flex-end',
            padding: 16,
          }}
        >
          <Text className="text-on-surface text-3xl font-extrabold tracking-tight mb-1" style={{ fontFamily: 'Space Grotesk' }}>
            {getSessionName(session.startedAt, session.type).toUpperCase()}
          </Text>
          <Text className="text-on-surface-variant text-[14px] font-semibold">
            {formatSessionDate(session.startedAt)}
          </Text>
        </LinearGradient>

        <View 
          className="absolute top-4 right-4 flex-row items-center px-2 py-1 gap-1"
          style={{ backgroundColor: colors.surfaceContainer + 'D9' }}
        >
          <Ionicons name={TYPE_ICON[type]} size={12} color={colors.onSurface} />
          <Text className="text-on-surface text-[11px] font-bold tracking-[0.5px]">
            {TYPE_LABEL[type]}
          </Text>
        </View>
      </View>

      {/* Info Stats */}
      <View className="p-4 flex-row items-start">
        <StatCol label="DISTANCE" value={formatDistance(session.distanceMeters)} />
        <View className="w-[1px] bg-outline-variant self-stretch mx-2" />
        <StatCol label={col2Label} value={col2Value} />
        <View className="w-[1px] bg-outline-variant self-stretch mx-2" />
        <StatCol label="TIME" value={formatDuration(session.durationSec)} />
      </View>
    </TouchableOpacity>
  );
});
