import { PostCard } from "@/components/feed/PostCard";
import { StoriesRow } from "@/components/feed/StoriesRow";
import { MOCK_POSTS, MOCK_STORIES, type Post } from "@/lib/mockFeedData";
import { FeedHeader } from "@/components/ui/FeedHeader";
import React, { useCallback } from "react";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STORIES_HEADER = <StoriesRow stories={MOCK_STORIES} />;

export default function Home() {
  const insets = useSafeAreaInsets();

  const renderPost = useCallback(
    ({ item }: { item: Post }) => <PostCard {...item} />,
    []
  );

  const keyExtractor = useCallback((item: Post) => item.id, []);

  return (
    <View className="flex-1 bg-surface">
      <View style={{ paddingTop: insets.top }} className="bg-background">
        <FeedHeader />
      </View>

      <FlatList
        data={MOCK_POSTS}
        keyExtractor={keyExtractor}
        renderItem={renderPost}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        ListHeaderComponent={STORIES_HEADER}
        removeClippedSubviews
      />
    </View>
  );
}
