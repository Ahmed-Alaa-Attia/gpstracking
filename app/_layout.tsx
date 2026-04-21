import { useEffect } from 'react';
import { Stack } from "expo-router";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { readPending, clearPending } from '@/lib/pendingSession';
import { saveSession } from '@/lib/sessions';
import '@/lib/locationTask';
import '../global.css';

export default function RootLayout() {
  useEffect(() => {
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
