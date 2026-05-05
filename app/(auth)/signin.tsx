import {
  AuthSocialDivider,
  LabeledField,
} from "@/components/auth/AuthFormFields";
import { AuthScreenLayout } from "@/components/auth/AuthScreenLayout";
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

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const onSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing fields", "Enter your email and password.");
      return;
    }
    await setAuthSession(true);
    router.replace("/(tabs)");
  };

  return (
    <AuthScreenLayout>
      <Text
        className="text-left text-primary text-label-md mt-26 mb-1"
        style={{ fontFamily: fontFamily.semibold }}
      >
        Member portal
      </Text>
      <Text
        className="text-left text-3xl font-bold text-on-surface uppercase tracking-wide mt-4 mb-8"
        style={{ fontFamily: fontFamily.bold }}
      >
        Welcome{"\n"}back
      </Text>
      <LabeledField
        label="Email address"
        value={email}
        onChangeText={setEmail}
        placeholder="runner@trackooo.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <LabeledField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry={!showPassword}
        rightAccessory={
          <Pressable
            onPress={() => setShowPassword((s) => !s)}
            hitSlop={12}
            className="p-1"
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={22}
              color={colors.onSurfaceVariant}
            />
          </Pressable>
        }
      />

      <Pressable
        onPress={() =>
          Alert.alert("Forgot password", "Reset flow will be added with your auth provider.")
        }
        className="self-end mb-6"
      >
        <Text
          className="text-[11px] font-semibold tracking-[0.12em] text-on-surface-variant uppercase"
          style={{ fontFamily: fontFamily.semibold }}
        >
          Forgot password?
        </Text>
      </Pressable>

      <Pressable
        onPress={onSignIn}
        className="rounded-[12px] bg-primary py-[18px] px-6 active:opacity-90"
        style={{
          shadowColor: colors.primary,
          shadowOpacity: 0.35,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <View className="flex-row items-center justify-center gap-2">
          <Text
            className="text-base font-bold uppercase tracking-[0.14em] text-on-primary"
            style={{ fontFamily: fontFamily.bold }}
          >
            Sign in
          </Text>
          <Ionicons name="arrow-forward" size={20} color={colors.onPrimary} />
        </View>
      </Pressable>

      <AuthSocialDivider />
      <AuthSocialButtons />

      <View className="flex-row flex-wrap items-center justify-center gap-1 mt-10">
        <Text
          className="text-sm text-on-surface-variant uppercase tracking-wide"
          style={{ fontFamily: fontFamily.regular }}
        >
          New to the track?
        </Text>
        <Pressable onPress={() => router.push("/signup")} hitSlop={8}>
          <Text
            className="text-sm font-bold uppercase tracking-wide text-primary"
            style={{ fontFamily: fontFamily.bold }}
          >
            Create account
          </Text>
        </Pressable>
      </View>
    </AuthScreenLayout>
  );
}
