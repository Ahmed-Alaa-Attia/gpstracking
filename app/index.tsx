import { getAuthSession } from "@/lib/authSession";
import { colors } from "@/constants/theme";
import { Redirect, useRootNavigationState } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

export default function Index() {
  const rootNavigation = useRootNavigationState();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await getAuthSession();
      if (!cancelled) setSignedIn(ok);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const navReady = Boolean(rootNavigation?.key);
  const sessionReady = signedIn !== null;

  if (!navReady || !sessionReady) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.surfaceContainerLowest }}
      />
    );
  }

  if (signedIn) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/signin" />;
}
