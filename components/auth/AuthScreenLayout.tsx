import { fontFamily } from "@/constants/fonts";
import { colors } from "@/constants/theme";
import React from "react";
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const authBg = require("@/assets/AuthBackground.png");

type Props = {
  children: React.ReactNode;
};

export function AuthScreenLayout({ children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground
      source={authBg}
      style={styles.bg}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
        style={{ paddingTop: insets.top  }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 8 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text
            className="text-center font-bold uppercase tracking-[0.28em] text-primary"
            style={{ fontFamily: fontFamily.bold, fontSize: 26, letterSpacing: 4 }}
          >
            TRACKOOO
          </Text>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
});
