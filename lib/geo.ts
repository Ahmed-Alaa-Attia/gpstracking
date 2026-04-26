export interface LatLng {
  lat: number;
  lng: number;
}

export interface TrackPoint extends LatLng {
  t: number;
  speed: number | null;
  accuracy: number | null;
  segment: number;
  heading?: number | null;
}

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const ACCURACY_MAX_M = 15;       // tighter ceiling — background iOS often inflates accuracy claims
export const MIN_STEP_M = 5;            // require 5m of real motion to count
export const MAX_SPEED_MPS = 30;        // ~108 km/h; filters GPS-jitter velocity spikes
export const MIN_DT_MS = 0;
export const JITTER_ACCURACY_FACTOR = 0.7; // movement must exceed 70% of the accuracy ring
export const STATIONARY_DOPPLER_MPS = 0.5; // doppler speed below this means "not really moving"

export function acceptPoint(prev: TrackPoint | null, next: TrackPoint): boolean {
  if (next.accuracy != null && next.accuracy > ACCURACY_MAX_M) return false;
  if (prev === null) return true;
  const dt = next.t - prev.t;
  if (dt < MIN_DT_MS) return false;
  const d = haversineMeters(prev, next);
  const uncertainty = Math.max(prev.accuracy ?? 0, next.accuracy ?? 0);
  // Movement must exceed MIN_STEP_M AND a fraction of the GPS uncertainty.
  if (d < Math.max(MIN_STEP_M, uncertainty * JITTER_ACCURACY_FACTOR)) return false;
  if (dt > 100) {
    const mps = d / (dt / 1000);
    if (mps > MAX_SPEED_MPS) return false;
    // Doppler cross-check: if both fixes have a reliable doppler speed and they
    // both report essentially stationary, but positions claim movement, that's
    // sensor-fusion drift (e.g. shaking the phone in background). Drop it.
    const prevStill = prev.speed != null && prev.speed >= 0 && prev.speed < STATIONARY_DOPPLER_MPS;
    const nextStill = next.speed != null && next.speed >= 0 && next.speed < STATIONARY_DOPPLER_MPS;
    if (prevStill && nextStill && mps > 1) return false;
  }
  return true;
}

export interface SessionStats {
  distanceMeters: number;
  avgSpeedMps: number;
  maxSpeedMps: number;
  paceSecPerKm: number | null;
}

export function computeStats(points: TrackPoint[], durationSec: number): SessionStats {
  if (points.length < 2) {
    return { distanceMeters: 0, avgSpeedMps: 0, maxSpeedMps: 0, paceSecPerKm: null };
  }
  let distance = 0;
  let maxSpeed = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (curr.segment !== prev.segment) continue;
    const segDist = haversineMeters(prev, curr);
    distance += segDist;
    // Max speed uses only GPS doppler speed (trustworthy); derived-from-distance
    // is discarded because indoor jitter produces huge fake velocities.
    const s = curr.speed;
    if (s != null && s >= 0 && s <= MAX_SPEED_MPS && s > maxSpeed) maxSpeed = s;
  }
  const avg = durationSec > 0 ? distance / durationSec : 0;
  const pace = distance > 0 && durationSec > 0 ? durationSec / (distance / 1000) : null;
  return {
    distanceMeters: distance,
    avgSpeedMps: avg,
    maxSpeedMps: Math.min(maxSpeed, MAX_SPEED_MPS),
    paceSecPerKm: pace,
  };
}
