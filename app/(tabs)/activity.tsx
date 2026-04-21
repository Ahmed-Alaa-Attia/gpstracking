import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GridBackground } from '@/components/GridBackground';
import { listSessions, type SessionDoc } from '@/lib/sessions';
import { formatDistance, formatDuration } from '@/lib/format';

export default function Activity() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<SessionDoc[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await listSessions(null, { limit: 50 });
      setItems(data);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View className="flex-1 bg-surface">
      <GridBackground />
      <SafeAreaView className="flex-1" edges={['top']}>
        <Text className="text-display-sm text-on-surface px-6 py-4">Activity</Text>
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <Text className="text-body-md text-on-surface-variant mt-12 text-center">
              No sessions yet. Tap Start on Home to record your first route.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/session/${item.id}`)}
              className="bg-surface-container-high rounded-2xl p-5 border border-outline-variant"
            >
              <Text className="text-label-md text-on-surface-variant">
                {item.startedAt.toDate().toLocaleString()}
              </Text>
              <View className="flex-row mt-2">
                <Text className="text-title-md text-on-surface flex-1">
                  {formatDistance(item.distanceMeters)}
                </Text>
                <Text className="text-title-md text-on-surface-variant">
                  {formatDuration(item.durationSec)}
                </Text>
              </View>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </View>
  );
}
