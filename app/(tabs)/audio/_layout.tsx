import { Stack } from "expo-router";
import React from "react";

export default function AudioLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#10141a" },
      }}
    />
  );
}

