import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Settings() {
  return (
    <View className="flex-1 bg-surface" style={{ flex: 1 }}>
      <SafeAreaView
        className="flex-1"
        style={{ flex: 1 }}
        edges={["top", "left", "right"]}
      >
      <View className="flex-1 px-6 pt-6 bg-surface" style={{ flex: 1 }}>
        <Text className="text-label-md text-on-surface-variant">
          Neon Cartographer
        </Text>
        <Text className="text-display-lg text-on-surface mt-2">
          System
          {"\n"}
          <Text className="text-primary">Settings.</Text>
        </Text>
        <Text className="text-body-md text-on-surface-variant mt-4">
          Configure data frequency, unit systems, and cloud synchronization.
        </Text>
      </View>
      </SafeAreaView>
    </View>
  );
}
