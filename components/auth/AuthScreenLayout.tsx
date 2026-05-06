import { colors } from "@/constants/theme";
import { Image } from 'expo-image';
import React from "react";
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet
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

          <Image
                  source={require('@/assets/trackoo.png')}
                  contentFit="cover"
                  style={{ width: 180, height: 70, alignSelf: 'center' }}
                />
 
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
