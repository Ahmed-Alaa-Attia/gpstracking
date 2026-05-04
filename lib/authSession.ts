import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@trackotest3/auth-session";

export async function getAuthSession(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === "1";
  } catch {
    return false;
  }
}

export async function setAuthSession(active: boolean): Promise<void> {
  try {
    if (active) {
      await AsyncStorage.setItem(KEY, "1");
    } else {
      await AsyncStorage.removeItem(KEY);
    }
  } catch {
    // ignore storage failures
  }
}
