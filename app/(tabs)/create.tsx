import React from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Create() {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-1 bg-surface items-center justify-center"
      style={{ paddingBottom: insets.bottom + 150 }}
    >
      <Text className="text-on-surface-variant text-base">
        Create Post — coming soon
      </Text>
    </View>
  );
}
