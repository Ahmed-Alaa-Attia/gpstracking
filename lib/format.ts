const pad = (n: number) => n.toString().padStart(2, '0');

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(sec)}`;
  return `${pad(m)}:${pad(sec)}`;
}

export function formatSpeed(mps: number): string {
  const clamped = Math.max(0, mps);
  return `${(clamped * 3.6).toFixed(1)} km/h`;
}

export function formatPace(secPerKm: number | null): string {
  if (secPerKm == null || !isFinite(secPerKm)) return '--:--';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${pad(s)} /km`;
}
