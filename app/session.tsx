import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocationTracker } from '@/hooks/useLocationTracker';
import { SessionMap } from '@/components/session/SessionMap';
import { StatsSheet } from '@/components/session/StatsSheet';
import { PermissionGate } from '@/components/session/PermissionGate';
import { saveSession } from '@/lib/sessions';
import { savePending, clearPending } from '@/lib/pendingSession';
import { colors } from '@/constants/theme';

export default function SessionScreen() {
  const t = useLocationTracker();
  const [saving, setSaving] = useState(false);
  const nav = useNavigation();

  useEffect(() => {
    if (t.status === 'idle') {
      t.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.status]);

  useEffect(() => {
    const unsub = nav.addListener('beforeRemove', (e) => {
      if (t.status === 'tracking' || t.status === 'paused') {
        e.preventDefault();
        Alert.alert('Session in progress', 'What do you want to do?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => { t.stop(); nav.dispatch(e.data.action); } },
          { text: 'Stop & Save', onPress: async () => { await handleStop(); nav.dispatch(e.data.action); } },
        ]);
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav, t.status]);

  const handleStop = useCallback(async () => {
    t.stop();
    if (t.points.length < 2) { router.back(); return; }
    setSaving(true);
    const startedAt = new Date(t.startedAt ?? Date.now() - t.durationSec * 1000);
    const input = {
      userId: null,
      type: 'generic' as const,
      startedAt,
      endedAt: new Date(),
      durationSec: t.durationSec,
      distanceMeters: t.distanceMeters,
      avgSpeedMps: t.avgSpeedMps,
      maxSpeedMps: t.maxSpeedMps,
      paceSecPerKm: t.paceSecPerKm,
      points: t.points,
      steps: t.steps,
    };
    try {
      await savePending(input);
      const id = await saveSession(input);
      await clearPending();
      router.replace(`/session/${id}`);
    } catch (err) {
      setSaving(false);
      Alert.alert('Save failed', 'Your session is kept locally. Retry?', [
        { text: 'Cancel' },
        { text: 'Retry', onPress: handleStop },
      ]);
    }
  }, [t]);

  if (t.status === 'permission-denied') {
    return <PermissionGate canAskAgain={t.canAskAgain} onRequest={t.requestPermission} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <SessionMap
        points={t.points}
        follow
        heading={t.heading}
        initialRegion={
          t.initialPos
            ? { latitude: t.initialPos.lat, longitude: t.initialPos.lng, latitudeDelta: 0.005, longitudeDelta: 0.005 }
            : undefined
        }
      />
      <SafeAreaView edges={['top']} pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16 }}>
          <Pressable onPress={() => router.back()} style={{ backgroundColor: colors.surfaceContainerLow, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }}>
            <Text style={{ color: colors.onSurface }}>←</Text>
          </Pressable>
          {saving && <Text style={{ color: colors.primary }}>Saving…</Text>}
        </View>
      </SafeAreaView>
      <StatsSheet
        status={t.status}
        distanceMeters={t.distanceMeters}
        durationSec={t.durationSec}
        currentSpeedMps={t.currentSpeedMps}
        avgSpeedMps={t.avgSpeedMps}
        maxSpeedMps={t.maxSpeedMps}
        paceSecPerKm={t.paceSecPerKm}
        steps={t.steps}
        onPause={t.pause}
        onResume={t.resume}
        onStop={handleStop}
      />
    </View>
  );
}
