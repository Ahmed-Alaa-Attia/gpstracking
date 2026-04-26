import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { AnimatedSplash } from '@/components/AnimatedSplash';
import { clearPending, readPending } from '@/lib/pendingSession';
import '@/lib/locationTask';
import { saveSession } from '@/lib/sessions';
import { Stack } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';

export default function RootLayout() {
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
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#10141a' }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#10141a" },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="session" options={{ presentation: 'card' }} />
            <Stack.Screen name="session/[id]" options={{ presentation: 'card' }} />
          </Stack>
          {!splashDone && (
            <AnimatedSplash onAnimationComplete={handleSplashComplete} />
          )}
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
