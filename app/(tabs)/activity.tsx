import { SessionCard } from '@/components/stats/SessionCard';
import { StatsBento } from '@/components/stats/StatsBento';
import { FeedHeader } from '@/components/ui/FeedHeader';
import { colors } from '@/constants/theme';
import { listSessions, type SessionDoc } from '@/lib/sessions';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { Dimensions, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CARD_WIDTH = Dimensions.get('window').width - 32;

type ListHeaderProps = {
  totalKm: number;
  activeDays: number;
  onStart: () => void;
};

const StatsListHeader = memo(function StatsListHeader({
  totalKm,
  activeDays,
  onStart,
}: ListHeaderProps) {
  return (
    <View>
      <TouchableOpacity
        onPress={onStart}
        activeOpacity={0.85}
        className="flex-row items-center justify-center mt-10 mx-0 h-[60px] bg-primary rounded-lg gap-2"
      >
        <Ionicons name="play" size={24} color={colors.onPrimary} />
        <Text className="text-on-primary text-lg font-bold tracking-[1px]">
          START NEW SESSION
        </Text>
      </TouchableOpacity>

      <StatsBento totalKm={totalKm} activeDays={activeDays} />

      <Text className="text-on-surface text-3xl font-extrabold tracking-[0.5px] mt-6 mb-2">
        RECENT SESSIONS
      </Text>
    </View>
  );
});

export default function Stats() {
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      setSessions(await listSessions(null, { limit: 50 }));
    } finally {
      if (isManualRefresh) setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(false); }, [load]));

  const totalKm = useMemo(
    () => sessions.reduce((acc, s) => acc + s.distanceMeters / 1000, 0),
    [sessions]
  );

  const activeDays = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const days = new Set(
      sessions
        .filter((s) => s.startedAt.toDate().getTime() >= sevenDaysAgo)
        .map((s) => s.startedAt.toDate().toDateString())
    );
    return days.size;
  }, [sessions]);

  const handleStart = useCallback(() => router.push('/session'), []);
  const handleCardPress = useCallback((id: string) => router.push(`/session/${id}`), []);

  const renderItem = useCallback(
    ({ item }: { item: SessionDoc }) => (
      <SessionCard session={item} cardWidth={CARD_WIDTH} onPress={handleCardPress} />
    ),
    [handleCardPress]
  );

  const keyExtractor = useCallback((item: SessionDoc) => item.id, []);

  const listHeader = useMemo(
    () => (
      <StatsListHeader
        totalKm={totalKm}
        activeDays={activeDays}
        onStart={handleStart}
      />
    ),
    [totalKm, activeDays, handleStart]
  );

  return (
    <View className="flex-1 bg-surface">
      <View style={{ paddingTop: insets.top }} className="bg-background">
        <FeedHeader />
      </View>
      <FlatList
        data={sessions}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 80,
          gap: 12,
        }}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !refreshing ? (
            <Text className="text-on-surface-variant text-sm text-center mt-12">
              No sessions yet. Tap Start New Session to record your first route.
            </Text>
          ) : null
        }
        removeClippedSubviews
      />
    </View>
  );
}
