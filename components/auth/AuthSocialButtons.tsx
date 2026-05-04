import { fontFamily } from "@/constants/fonts";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Alert, Pressable, Text, View } from "react-native";

export function AuthSocialButtons() {
  const onSocial = (provider: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Alert.alert(provider, "Social sign-in will be connected soon.");
  };

  return (
    <View className="flex-row gap-3">
      <Pressable
        onPress={() => onSocial("Google")}
        className="flex-1 flex-row items-center justify-center gap-2 rounded-[10px] bg-surface-container-high py-3.5 active:opacity-80"
      >
        <Ionicons name="logo-google" size={22} color="#ffffff" />
        <Text
          className="text-[11px] font-bold tracking-[0.12em] text-on-surface uppercase"
          style={{ fontFamily: fontFamily.bold }}
        >
          Google
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onSocial("Apple")}
        className="flex-1 flex-row items-center justify-center gap-2 rounded-[10px] bg-surface-container-high py-3.5 active:opacity-80"
      >
        <Ionicons name="logo-apple" size={22} color="#ffffff" />
        <Text
          className="text-[11px] font-bold tracking-[0.12em] text-on-surface uppercase"
          style={{ fontFamily: fontFamily.bold }}
        >
          Apple
        </Text>
      </Pressable>
    </View>
  );
}
