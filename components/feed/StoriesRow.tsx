import type { Story } from "@/lib/mockFeedData";
import React, { memo, useCallback } from "react";
import { ScrollView, View } from "react-native";
import { StoryItem } from "./StoryItem";

type Props = {
  stories: Story[];
  onStoryPress?: (id: string) => void;
};

export const StoriesRow = memo(function StoriesRow({ stories, onStoryPress }: Props) {
  const handlePress = useCallback(
    (id: string) => onStoryPress?.(id),
    [onStoryPress]
  );

  return (
    <View className="bg-surface-container-low py-3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 8 }}
      >
        {stories.map((story) => (
          <StoryItem
            key={story.id}
            {...story}
            onPress={() => handlePress(story.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
});
