import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SessionMap } from '@/components/session/SessionMap';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/Button';
import { getSession, deleteSession, type SessionDoc } from '@/lib/sessions';
import { formatDistance, formatDuration, formatPace, formatSpeed } from '@/lib/format';
import { colors } from '@/constants/theme';

export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [doc, setDoc] = useState<SessionDoc | null>(null);

  useEffect(() => {
    if (!id) return;
    getSession(id).then(setDoc);
  }, [id]);

  if (!doc) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const onDelete = () => {
    Alert.alert('Delete session?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { await deleteSession(doc.id); router.back(); },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ height: 320 }}>
        <SessionMap points={doc.points} follow={false} />
      </View>
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <Pressable onPress={() => router.back()} style={{ margin: 16, backgroundColor: colors.surfaceContainerLow, alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ color: colors.onSurface }}>←</Text>
        </Pressable>
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text className="text-label-md text-on-surface-variant">
          {doc.startedAt.toDate().toLocaleString()}
        </Text>
        <View className="flex-row mt-4 mb-4">
          <StatCard label="Distance" value={formatDistance(doc.distanceMeters)} unit="" />
          <StatCard label="Time" value={formatDuration(doc.durationSec)} unit="" />
        </View>
        <View className="flex-row mb-4">
          <StatCard label="Avg" value={formatSpeed(doc.avgSpeedMps)} unit="" />
          <StatCard label="Max" value={formatSpeed(doc.maxSpeedMps)} unit="" />
        </View>
        <View className="flex-row mb-8">
          <StatCard label="Steps" value={String(doc.steps ?? 0)} unit="" />
        </View>
        <Text className="text-body-md text-on-surface-variant mb-8">
          Pace {formatPace(doc.paceSecPerKm)}
        </Text>
        <Button label="Delete Session" onPress={onDelete} />
      </ScrollView>
    </View>
  );
}
