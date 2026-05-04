import { fontFamily } from "@/constants/fonts";
import { colors } from "@/constants/theme";
import React, { useState } from "react";
import {
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

type LabeledFieldProps = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  rightAccessory?: React.ReactNode;
} & Omit<TextInputProps, "value" | "onChangeText">;

export function LabeledField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  rightAccessory,
  ...rest
}: LabeledFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View className="mb-4">
      <Text
        className="text-label-md text-on-surface-variant mb-2"
        style={{ fontFamily: fontFamily.semibold }}
      >
        {label}
      </Text>
      <View
        className="flex-row items-center rounded-[10px] bg-surface-container-high px-4 min-h-[52px]"
        style={{
          borderWidth: focused ? 1.5 : 0,
          borderColor: focused ? colors.primary : "transparent",
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.onSurfaceVariant}
          secureTextEntry={secureTextEntry}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 text-body-md text-on-surface py-3.5"
          style={{ fontFamily: fontFamily.regular }}
          selectionColor={colors.primary}
          {...rest}
        />
        {rightAccessory}
      </View>
    </View>
  );
}

type DividerProps = {
  label?: string;
};

export function AuthSocialDivider({ label = "OR CONTINUE WITH" }: DividerProps) {
  return (
    <View className="flex-row items-center gap-3 my-6">
      <View className="flex-1 h-px bg-outline" />
      <Text
        className="text-[11px] font-semibold tracking-[0.14em] text-on-surface-variant uppercase"
        style={{ fontFamily: fontFamily.semibold }}
      >
        {label}
      </Text>
      <View className="flex-1 h-px bg-outline" />
    </View>
  );
}
