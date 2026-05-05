import { FeedHeader } from "@/components/ui/FeedHeader";
import { colors } from "@/constants/theme";
import { searchTracks, type DeezerTrack } from "@/lib/deezer";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type CategoryId = "rap" | "classic" | "shaaby";
const CATEGORIES: Array<{ id: CategoryId; label: string; query: string }> = [
  { id: "rap", label: "RAP", query: "marwan pablo" },
  { id: "classic", label: "CLASSIC", query: "amr diab" },
  { id: "shaaby", label: "SHAABY", query: "shaabi egypt" },
];


function TrackRow({ item }: { item: DeezerTrack }) {
  const playable = Boolean(item.preview);
  return (
    <Pressable
      onPress={() => router.push(`/audio/${item.id}`)}
      className="flex-row items-center gap-3 rounded-2xl bg-surface-container-low border border-surface-container-high px-3 py-3 active:opacity-85"
    >
      <Image
        source={{ uri: item.album?.cover_medium || item.album?.cover || undefined }}
        contentFit="cover"
        style={{ width: 56, height: 56, borderRadius: 12 }}
      />
      <View className="flex-1">
        <Text
          className="text-on-surface text-[15px] font-semibold tracking-[0.2px]"
          numberOfLines={1}
        >
          {item.title || "Untitled"}
        </Text>
        <Text className="text-on-surface-variant text-[12px] font-semibold" numberOfLines={1}>
          {item.artist?.name ? `by ${item.artist.name}` : "Deezer"}
        </Text>
      </View>
      <View className="items-center justify-center">
        <Ionicons
          name={playable ? "play-circle" : "alert-circle-outline"}
          size={24}
          color={playable ? colors.primary : colors.onSurfaceVariant}
        />
      </View>
    </Pressable>
  );
}

export default function AudioListScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<DeezerTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<CategoryId>("classic");
  const query = useMemo(
    () => CATEGORIES.find((c) => c.id === category)?.query ?? "amr diab",
    [category]
  );


  const load = useCallback(async (isManual = false) => {
    isManual ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const data = await searchTracks(query, 25);
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tracks");
    } finally {
      isManual ? setRefreshing(false) : setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load(false);
  }, [load]);

  const CategoryBar = useMemo(
    () => (
      <View className="flex-row gap-2 mb-4">
        {CATEGORIES.map((c) => {
          const active = c.id === category;
          return (
            <Pressable
              key={c.id}
              onPress={() => setCategory(c.id)}
              className={[
                "px-3 py-2 rounded-xl border active:opacity-85",
                active
                  ? "bg-primary border-primary"
                  : "bg-surface-container-low border-surface-container-high",
              ].join(" ")}
            >
              <Text
                className={[
                  "text-[11px] font-bold tracking-[0.12em] uppercase",
                  active ? "text-on-primary" : "text-on-surface",
                ].join(" ")}
              >
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    ),
    [category]
  );

  const keyExtractor = useCallback((t: DeezerTrack) => String(t.id), []);
  const renderItem = useCallback(
    ({ item }: { item: DeezerTrack }) => <TrackRow item={item} />,
    []
  );

  const header = useMemo(
    () => (
      <View>
        <Text className="text-on-surface text-3xl font-extrabold tracking-[0.5px] mt-6 mb-3">
          TRAINING TRACKS
        </Text>
        <Text className="text-on-surface-variant text-[12px] font-semibold tracking-[0.12em] uppercase mb-4">
              Deezer Arabic categories
        </Text>
        {CategoryBar}
        <Text className="text-on-surface-variant text-[12px] font-semibold tracking-[0.12em] uppercase mb-2">
          Results — {query}
        </Text>
      </View>
    ),
    [CategoryBar, query]
  );

  return (
    <View className="flex-1 bg-surface">
      <View style={{ paddingTop: insets.top }} className="bg-background">
        <FeedHeader />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 90,
            paddingTop: 6,
            gap: 12,
          }}
          ListHeaderComponent={header}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <Text className="text-on-surface-variant text-sm text-center mt-12">
              {error ? error : "No tracks found."}
            </Text>
          }
          removeClippedSubviews
        />
      )}
    </View>
  );
}

