import { FeedHeader } from "@/components/ui/FeedHeader";
import { colors } from "@/constants/theme";
import {
  fetchHotPosts,
  getPlayableUrlFromEid,
  type OpenWhydPost,
} from "@/lib/openwhyd";
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

function TrackRow({ item }: { item: OpenWhydPost }) {
  const playable = getPlayableUrlFromEid(item.eId) != null;

  return (
    <Pressable
      onPress={() => router.push(`/audio/${item._id}`)}
      className="flex-row items-center gap-3 rounded-2xl bg-surface-container-low border border-surface-container-high px-3 py-3 active:opacity-85"
    >
      <Image
        source={{ uri: item.img || undefined }}
        contentFit="cover"
        style={{ width: 56, height: 56, borderRadius: 12 }}
      />
      <View className="flex-1">
        <Text
          className="text-on-surface text-[15px] font-semibold tracking-[0.2px]"
          numberOfLines={1}
        >
          {item.name || "Untitled"}
        </Text>
        <Text className="text-on-surface-variant text-[12px] font-semibold" numberOfLines={1}>
          {item.uNm ? `by ${item.uNm}` : "Openwhyd"}
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
  const [items, setItems] = useState<OpenWhydPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isManual = false) => {
    isManual ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const data = await fetchHotPosts({ limit: 25, genre: "electro" });
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tracks");
    } finally {
      isManual ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const keyExtractor = useCallback((p: OpenWhydPost) => p._id, []);
  const renderItem = useCallback(
    ({ item }: { item: OpenWhydPost }) => <TrackRow item={item} />,
    []
  );

  const header = useMemo(
    () => (
      <View>
        <Text className="text-on-surface text-3xl font-extrabold tracking-[0.5px] mt-6 mb-3">
          TRAINING TRACKS
        </Text>
      </View>
    ),
    []
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

