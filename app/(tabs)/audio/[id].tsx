import { FeedHeader } from "@/components/ui/FeedHeader";
import { colors } from "@/constants/theme";
import { fetchTrack, type DeezerTrack } from "@/lib/deezer";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

export default function AudioPlayerScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const trackId = typeof id === "string" ? Number(id) : NaN;

  const [track, setTrack] = useState<DeezerTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (!Number.isFinite(trackId)) throw new Error("Invalid track id");
        const t = await fetchTrack(trackId);
        if (alive) setTrack(t);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load track");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [trackId]);

  const audioUrl = useMemo(() => track?.preview ?? null, [track?.preview]);

  const player = useAudioPlayer(audioUrl, { updateInterval: 250, downloadFirst: false });
  const status = useAudioPlayerStatus(player);

  const canPlay = audioUrl != null && !status.loading;

  const onTogglePlay = useCallback(() => {
    if (!audioUrl) return;
    if (status.playing) player.pause();
    else {
      if (status.duration > 0 && status.currentTime >= status.duration) player.seekTo(0);
      player.play();
    }
  }, [audioUrl, player, status.currentTime, status.duration, status.playing]);

  const onSeek = useCallback(
    (deltaSeconds: number) => {
      if (!audioUrl) return;
      const next = Math.max(0, (status.currentTime ?? 0) + deltaSeconds);
      player.seekTo(next);
    },
    [audioUrl, player, status.currentTime]
  );

  if (loading) {
    return (
      <View className="flex-1 bg-surface">
        <View style={{ paddingTop: insets.top }} className="bg-background">
          <FeedHeader />
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!track || error) {
    return (
      <View className="flex-1 bg-surface">
        <View style={{ paddingTop: insets.top }} className="bg-background">
          <FeedHeader />
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-on-surface text-lg font-bold mb-2">Couldn’t load track</Text>
          <Text className="text-on-surface-variant text-sm text-center">
            {error ?? "Unknown error"}
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-6 px-5 py-3 rounded-xl bg-surface-container-high active:opacity-85"
          >
            <Text className="text-on-surface font-bold tracking-[0.1em] uppercase">Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const duration = status.duration ?? 0;
  const current = status.currentTime ?? 0;
  const progress = duration > 0 ? Math.min(1, current / duration) : 0;

  return (
    <View className="flex-1 bg-surface">
      <View style={{ paddingTop: insets.top }} className="bg-background">
        <FeedHeader />
      </View>

      <View className="flex-1 px-4 pt-6">
        <View className="rounded-3xl overflow-hidden border border-surface-container-high bg-surface-container-low">
          <Image
            source={{
              uri:
                track.album?.cover_xl ||
                track.album?.cover_big ||
                track.album?.cover_medium ||
                track.album?.cover ||
                undefined,
            }}
            contentFit="cover"
            style={{ width: "100%", height: 280 }}
          />
        </View>

        <Text className="text-on-surface text-3xl font-extrabold tracking-[0.5px] mt-6" numberOfLines={2}>
          {track.title || "Untitled"}
        </Text>
        <Text className="text-on-surface-variant text-[12px] font-semibold tracking-[0.12em] uppercase mt-2">
          {track.artist?.name ? `Artist ${track.artist.name}` : "Deezer"}
        </Text>

        <View className="mt-8 bg-surface-container-low border border-surface-container-high rounded-2xl p-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-on-surface-variant text-[12px] font-semibold">
              {formatTime(current)}
            </Text>
            <Text className="text-on-surface-variant text-[12px] font-semibold">
              {formatTime(duration)}
            </Text>
          </View>

          <View className="h-[6px] rounded-full bg-surface-container-high overflow-hidden">
            <View style={{ width: `${progress * 100}%` }} className="h-full bg-primary" />
          </View>

          <View className="flex-row items-center justify-center gap-10 mt-7">
            <Pressable
              onPress={() => onSeek(-10)}
              disabled={!canPlay}
              className="w-14 h-14 items-center justify-center rounded-full bg-surface-container-high active:opacity-85 disabled:opacity-40"
            >
              <Ionicons name="play-back" size={24} color={colors.onSurface} />
            </Pressable>

            <Pressable
              onPress={onTogglePlay}
              disabled={!audioUrl}
              className="w-[78px] h-[78px] items-center justify-center rounded-full bg-primary active:opacity-85 disabled:opacity-40"
              style={{
                shadowColor: colors.primary,
                shadowOpacity: 0.3,
                shadowRadius: 14,
                elevation: 10,
              }}
            >
              <Ionicons
                name={status.playing ? "pause" : "play"}
                size={34}
                color={colors.onPrimary}
              />
            </Pressable>

            <Pressable
              onPress={() => onSeek(10)}
              disabled={!canPlay}
              className="w-14 h-14 items-center justify-center rounded-full bg-surface-container-high active:opacity-85 disabled:opacity-40"
            >
              <Ionicons name="play-forward" size={24} color={colors.onSurface} />
            </Pressable>
          </View>

          {!audioUrl && (
            <Text className="text-on-surface-variant text-[12px] text-center mt-6">
              No preview available for this track on Deezer. Try another one.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

