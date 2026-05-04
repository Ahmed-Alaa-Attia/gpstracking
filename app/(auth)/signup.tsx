import { AuthScreenLayout } from "@/components/auth/AuthScreenLayout";
import {
  AuthSocialDivider,
  LabeledField,
} from "@/components/auth/AuthFormFields";
import { AuthSocialButtons } from "@/components/auth/AuthSocialButtons";
import { fontFamily } from "@/constants/fonts";
import { colors } from "@/constants/theme";
import { setAuthSession } from "@/lib/authSession";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  Text,
  View,
} from "react-native";

export default function SignUpScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);

  const onCreateAccount = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert("Missing fields", "Fill in your name, email, and password.");
      return;
    }
    if (!agreed) {
      Alert.alert("Terms", "Please agree to the terms to continue.");
      return;
    }
    await setAuthSession(true);
    router.replace("/(tabs)");
  };

  return (
    <AuthScreenLayout>
      <Text
        className="text-center text-3xl font-bold text-on-surface uppercase tracking-wide mt-6 mb-8"
        style={{ fontFamily: fontFamily.bold }}
      >
        Join the elite
      </Text>

      <LabeledField
        label="Full name"
        value={fullName}
        onChangeText={setFullName}
        placeholder="Enter your identity"
        autoCapitalize="words"
      />

      <LabeledField
        label="Email address"
        value={email}
        onChangeText={setEmail}
        placeholder="user@protocol.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <LabeledField
        label="Security protocol (password)"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
      />

      <Pressable
        onPress={() => setAgreed((a) => !a)}
        className="flex-row gap-3 items-start mb-8 mt-1"
      >
        <View
          className="mt-0.5 w-[22px] h-[22px] rounded-full items-center justify-center border-2"
          style={{
            borderColor: colors.primary,
            backgroundColor: agreed ? colors.primary : "transparent",
          }}
        >
          {agreed ? (
            <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
          ) : null}
        </View>
        <Text
          className="flex-1 text-[11px] leading-5 text-on-surface-variant uppercase tracking-wide"
          style={{ fontFamily: fontFamily.regular }}
        >
          I agree to the{" "}
          <Text className="text-primary font-bold" style={{ fontFamily: fontFamily.bold }}>
            terms of engagement
          </Text>
          {" "}and{" "}
          <Text className="text-primary font-bold" style={{ fontFamily: fontFamily.bold }}>
            data protocols.
          </Text>
        </Text>
      </Pressable>

      <Pressable
        onPress={onCreateAccount}
        className="rounded-[12px] bg-primary py-[18px] px-6 active:opacity-90"
        style={{
          shadowColor: colors.primary,
          shadowOpacity: 0.35,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Text
          className="text-center text-base font-bold uppercase tracking-[0.14em] text-on-primary"
          style={{ fontFamily: fontFamily.bold }}
        >
          Create account
        </Text>
      </Pressable>

      <AuthSocialDivider />
      <AuthSocialButtons />

      <View className="flex-row flex-wrap items-center justify-center gap-1 mt-10">
        <Text
          className="text-sm text-on-surface-variant uppercase tracking-wide"
          style={{ fontFamily: fontFamily.regular }}
        >
          Already registered?
        </Text>
        <Pressable onPress={() => router.push("/signin")} hitSlop={8}>
          <Text
            className="text-sm font-bold uppercase tracking-wide text-primary"
            style={{ fontFamily: fontFamily.bold }}
          >
            Login to hub
          </Text>
        </Pressable>
      </View>
    </AuthScreenLayout>
  );
}
