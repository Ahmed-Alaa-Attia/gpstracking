import { setAuthSession } from "@/lib/authSession";
import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Settings() {
  const onSignOut = async () => {
    await setAuthSession(false);
    router.replace("/signin");
  };

  return (
    <View className="flex-1 bg-surface">
      <SafeAreaView
        className="flex-1"
        edges={["top", "left", "right"]}
      >
        <View className="flex-1 px-6 pt-6 bg-surface">
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

          <Pressable
            onPress={onSignOut}
            className="mt-10 self-start rounded-xl border border-outline px-5 py-3 active:opacity-80"
          >
            <Text className="text-label-md text-on-surface-variant">
              Sign out
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
