import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SessionInput } from './sessions';

const KEY = 'pending_session_v1';

export async function savePending(input: SessionInput): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify({
    ...input,
    startedAt: input.startedAt.toISOString(),
    endedAt: input.endedAt.toISOString(),
  }));
}

export async function readPending(): Promise<SessionInput | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  return {
    ...parsed,
    startedAt: new Date(parsed.startedAt),
    endedAt: new Date(parsed.endedAt),
  };
}

export async function clearPending(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
