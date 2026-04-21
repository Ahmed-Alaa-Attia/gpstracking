import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { acceptPoint, computeStats, type TrackPoint } from '@/lib/geo';
import {
  startBackgroundLocation,
  stopBackgroundLocation,
  subscribeLocations,
} from '@/lib/locationTask';

export type TrackerStatus =
  | 'idle'
  | 'requesting-permission'
  | 'permission-denied'
  | 'ready'
  | 'tracking'
  | 'paused'
  | 'stopped';

export function useLocationTracker() {
  const [status, setStatus] = useState<TrackerStatus>('idle');
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [heading, setHeading] = useState<number | null>(null);
  const [steps, setSteps] = useState(0);
  const [initialPos, setInitialPos] = useState<{ lat: number; lng: number } | null>(null);

  const startedAtRef = useRef<number | null>(null);
  const pausedAccumMsRef = useRef(0);
  const pauseStartRef = useRef<number | null>(null);
  const segmentRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPointRef = useRef<TrackPoint | null>(null);
  const headingSubRef = useRef<Location.LocationSubscription | null>(null);
  const pedSubRef = useRef<{ remove: () => void } | null>(null);
  const pedBaselineRef = useRef<number | null>(null);
  const pedAccumBeforeResumeRef = useRef(0);
  const pausedRef = useRef(false);

  const clearTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const startTick = useCallback(() => {
    clearTick();
    tickRef.current = setInterval(() => {
      if (!startedAtRef.current) return;
      const raw = Date.now() - startedAtRef.current - pausedAccumMsRef.current;
      setElapsedSec(Math.max(0, Math.floor(raw / 1000)));
    }, 1000);
  }, []);

  useEffect(() => {
    const unsub = subscribeLocations((locs) => {
      if (!startedAtRef.current || pausedRef.current) return;
      const accepted: TrackPoint[] = [];
      for (const loc of locs) {
        const next: TrackPoint = {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          t: loc.timestamp - startedAtRef.current,
          speed: loc.coords.speed ?? null,
          accuracy: loc.coords.accuracy ?? null,
          segment: segmentRef.current,
          heading: loc.coords.heading ?? null,
        };
        if (!acceptPoint(lastPointRef.current, next)) continue;
        lastPointRef.current = next;
        accepted.push(next);
      }
      if (accepted.length) setPoints((prev) => [...prev, ...accepted]);
    });
    return unsub;
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setStatus('requesting-permission');
    const fg = await Location.requestForegroundPermissionsAsync();
    setCanAskAgain(fg.canAskAgain);
    if (fg.status !== 'granted') {
      setStatus('permission-denied');
      return false;
    }
    try { await Location.requestBackgroundPermissionsAsync(); } catch {}
    setStatus('ready');
    return true;
  }, []);

  const startPedometer = useCallback(async () => {
    try {
      try { await Pedometer.requestPermissionsAsync(); } catch {}
      const available = await Pedometer.isAvailableAsync();
      if (!available) return;
      pedBaselineRef.current = null;
      pedAccumBeforeResumeRef.current = 0;
      setSteps(0);
      pedSubRef.current = Pedometer.watchStepCount((res) => {
        if (pausedRef.current) return;
        if (pedBaselineRef.current == null) pedBaselineRef.current = res.steps - 1;
        const sinceResume = Math.max(0, res.steps - (pedBaselineRef.current ?? 0));
        setSteps(pedAccumBeforeResumeRef.current + sinceResume);
      });
    } catch {}
  }, []);

  const start = useCallback(async () => {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.status !== 'granted') {
      const ok = await requestPermission();
      if (!ok) return;
    }
    startedAtRef.current = Date.now();
    pausedAccumMsRef.current = 0;
    pauseStartRef.current = null;
    segmentRef.current = 0;
    lastPointRef.current = null;
    pausedRef.current = false;
    setPoints([]);
    setElapsedSec(0);

    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setInitialPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {}

    await startBackgroundLocation();
    try {
      headingSubRef.current = await Location.watchHeadingAsync((h) => {
        const v = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
        if (v != null && v >= 0) setHeading(v);
      });
    } catch {}
    await startPedometer();
    setStatus('tracking');
    startTick();
  }, [requestPermission, startTick, startPedometer]);

  const pause = useCallback(() => {
    if (status !== 'tracking') return;
    pauseStartRef.current = Date.now();
    pausedRef.current = true;
    pedAccumBeforeResumeRef.current = steps;
    pedBaselineRef.current = null;
    clearTick();
    setStatus('paused');
  }, [status, steps]);

  const resume = useCallback(async () => {
    if (status !== 'paused') return;
    if (pauseStartRef.current) {
      pausedAccumMsRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
    }
    segmentRef.current += 1;
    lastPointRef.current = null;
    pausedRef.current = false;
    setStatus('tracking');
    startTick();
  }, [status, startTick]);

  const stop = useCallback(() => {
    pausedRef.current = true;
    headingSubRef.current?.remove();
    headingSubRef.current = null;
    pedSubRef.current?.remove();
    pedSubRef.current = null;
    clearTick();
    void stopBackgroundLocation();
    if (status === 'paused' && pauseStartRef.current) {
      pausedAccumMsRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
    }
    startedAtRef.current = null;
    setStatus('stopped');
  }, [status]);

  useEffect(() => () => {
    headingSubRef.current?.remove();
    pedSubRef.current?.remove();
    clearTick();
    void stopBackgroundLocation();
  }, []);

  const stats = useMemo(() => computeStats(points, elapsedSec), [points, elapsedSec]);
  const currentSpeed = useMemo(() => {
    const last = points[points.length - 1];
    return last?.speed ?? 0;
  }, [points]);

  return {
    status,
    canAskAgain,
    points,
    durationSec: elapsedSec,
    startedAt: startedAtRef.current,
    distanceMeters: stats.distanceMeters,
    avgSpeedMps: stats.avgSpeedMps,
    maxSpeedMps: stats.maxSpeedMps,
    paceSecPerKm: stats.paceSecPerKm,
    currentSpeedMps: currentSpeed,
    heading,
    steps,
    initialPos,
    requestPermission,
    start,
    pause,
    resume,
    stop,
  };
}
