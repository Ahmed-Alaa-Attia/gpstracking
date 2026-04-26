import { Button } from "@/components/Button";
import { GridBackground } from "@/components/GridBackground";
import { ToolTile } from "@/components/ToolTile";
import { icons } from "@/constants/icons";
import "@/global.css";
import { router } from "expo-router";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatCard } from "../../components/StatCard";

export default function Home() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-surface" style={{ flex: 1 }}>
      <GridBackground />
      <SafeAreaView className="flex-1" style={{ flex: 1 }} edges={["top"]}>
        <ScrollView
          className="flex-1"
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: insets.bottom + 100,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="mb-10">
            <Text className="text-label-md text-primary tracking-[2px]">
              We are Already tracking You !
            </Text>
            <Text className="text-display-lg text-on-surface mt-3 leading-[60px]">
              Alaa
              {"\n"}
              <Text className="text-primary glow-primary">Trackoo.</Text>
            </Text>
          </View>

          {/* Stats Bar */}
          <View className="flex-row mb-8">
            <StatCard label="Total Dist" value="128.4" unit="km" />
            <StatCard label="Avg Speed" value="42.5" unit="km/h" />
          </View>

          {/* Quick Tools */}
          <View className="mb-8">
            <Text className="text-label-md text-on-surface-variant mb-4">
              Quick Control
            </Text>
            <View className="flex-row justify-between">
              <ToolTile
                icon={icons.activity}
                label="History"
                onPress={() => router.push("/activity")}
              />
              <ToolTile
                icon={icons.wallet}
                label="Assets"
                onPress={() => router.push("/wallet")}
              />
              <ToolTile
                icon={icons.setting}
                label="Config"
                onPress={() => router.push("/settings")}
              />
            </View>
          </View>

          {/* Action Card */}
          <View className="bg-surface-container-high rounded-[32px] p-8 overflow-hidden border border-outline-variant">
            <View className="absolute -top-5 -right-5 w-[100px] h-[100px] rounded-full bg-primary opacity-10" />
            <Text className="text-headline-sm text-on-surface mb-2">
              Ready to Roll?
            </Text>
            <Text className="text-body-md text-on-surface-variant mb-6">
              Start your tracking session and let Trackoo handle the rest.
            </Text>

            <Button
              label="Start Session"
              onPress={() => router.push("/session")}
            />

            <View className="absolute -bottom-5 -left-5 w-[100px] h-[100px] rounded-full bg-primary opacity-10 backdrop-blur-3xl will-change-transform" />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
