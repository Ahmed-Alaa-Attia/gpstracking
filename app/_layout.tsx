import { AnimatedSplash } from "@/components/AnimatedSplash";
import { spaceGroteskFontMap } from "@/constants/fonts";
import "@/lib/locationTask";
import { clearPending, readPending } from "@/lib/pendingSession";
import { saveSession } from "@/lib/sessions";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(spaceGroteskFontMap);
  const fontsReady = fontsLoaded || fontError != null;
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    // Hide the native splash immediately — our AnimatedSplash overlay takes over from here
    SplashScreen.hideAsync().catch(() => {});
    (async () => {
      const pending = await readPending();
      if (!pending) return;
      try {
        await saveSession(pending);
        await clearPending();
      } catch {
        // leave slot in place; will retry next launch
      }
    })();
  }, []);

  const handleSplashComplete = useCallback(() => {
    setSplashDone(true);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#10141a" }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          {fontsReady ? (
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "#10141a" },
              }}
            >
              <Stack.Screen name="index" options={{ animation: "none" }} />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="session" options={{ presentation: "card" }} />
              <Stack.Screen
                name="session/[id]"
                options={{ presentation: "card" }}
              />
            </Stack>
          ) : null}
          {!splashDone && (
            <AnimatedSplash onAnimationComplete={handleSplashComplete} />
          )}
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
