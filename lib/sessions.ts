import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { TrackPoint } from './geo';

export type SessionType = 'run' | 'bike' | 'drive' | 'generic';

export interface SessionDoc {
  id: string;
  userId: string | null;
  type?: SessionType;
  startedAt: Timestamp;
  endedAt: Timestamp;
  durationSec: number;
  distanceMeters: number;
  avgSpeedMps: number;
  maxSpeedMps: number;
  paceSecPerKm: number | null;
  points: TrackPoint[];
  steps?: number;
  createdAt: Timestamp;
  schemaVersion: 1;
}

export interface SessionInput {
  userId: string | null;
  type?: SessionType;
  startedAt: Date;
  endedAt: Date;
  durationSec: number;
  distanceMeters: number;
  avgSpeedMps: number;
  maxSpeedMps: number;
  paceSecPerKm: number | null;
  points: TrackPoint[];
  steps?: number;
}

const COL = 'sessions';

export async function saveSession(input: SessionInput): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    userId: input.userId,
    type: input.type ?? 'generic',
    startedAt: Timestamp.fromDate(input.startedAt),
    endedAt: Timestamp.fromDate(input.endedAt),
    durationSec: input.durationSec,
    distanceMeters: input.distanceMeters,
    avgSpeedMps: input.avgSpeedMps,
    maxSpeedMps: input.maxSpeedMps,
    paceSecPerKm: input.paceSecPerKm,
    points: input.points,
    steps: input.steps ?? 0,
    createdAt: serverTimestamp(),
    schemaVersion: 1,
  });
  return ref.id;
}

export async function listSessions(
  userId: string | null,
  opts: { limit?: number } = {}
): Promise<SessionDoc[]> {
  const base = collection(db, COL);
  const q = userId
    ? query(base, where('userId', '==', userId), orderBy('startedAt', 'desc'), fbLimit(opts.limit ?? 50))
    : query(base, orderBy('startedAt', 'desc'), fbLimit(opts.limit ?? 50));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SessionDoc, 'id'>) }));
}

export async function getSession(id: string): Promise<SessionDoc | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<SessionDoc, 'id'>) };
}

export async function deleteSession(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
