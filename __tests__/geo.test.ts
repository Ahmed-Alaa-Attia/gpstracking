import { haversineMeters } from '@/lib/geo';

describe('haversineMeters', () => {
  it('returns 0 for identical points', () => {
    const p = { lat: 40.0, lng: -73.0 };
    expect(haversineMeters(p, p)).toBe(0);
  });

  it('computes ~111km for 1 degree latitude near equator', () => {
    const a = { lat: 0, lng: 0 };
    const b = { lat: 1, lng: 0 };
    expect(haversineMeters(a, b)).toBeGreaterThan(110_000);
    expect(haversineMeters(a, b)).toBeLessThan(112_000);
  });

  it('computes short distances within 1m tolerance', () => {
    const a = { lat: 40.0, lng: -73.0 };
    const b = { lat: 40.00009, lng: -73.0 }; // ~10m north
    expect(haversineMeters(a, b)).toBeGreaterThan(9);
    expect(haversineMeters(a, b)).toBeLessThan(11);
  });
});

import { acceptPoint } from '@/lib/geo';

const basePrev = { lat: 40, lng: -73, t: 0, speed: 0, accuracy: 5, segment: 0 };

describe('acceptPoint', () => {
  it('rejects first point with bad accuracy', () => {
    const next = { lat: 40, lng: -73, t: 0, speed: null, accuracy: 50, segment: 0 };
    expect(acceptPoint(null, next)).toBe(false);
  });

  it('accepts first point with good accuracy', () => {
    const next = { lat: 40, lng: -73, t: 0, speed: null, accuracy: 10, segment: 0 };
    expect(acceptPoint(null, next)).toBe(true);
  });

  it('rejects sub-2m jitter', () => {
    const next = { ...basePrev, lat: 40.000005, t: 1000 }; // ~0.5m
    expect(acceptPoint(basePrev, next)).toBe(false);
  });

  it('rejects teleport exceeding 60 m/s', () => {
    const next = { ...basePrev, lat: 40.01, t: 1000, accuracy: 5 }; // ~1.1km in 1s
    expect(acceptPoint(basePrev, next)).toBe(false);
  });

  it('rejects duplicate/near-duplicate timestamps', () => {
    const next = { ...basePrev, lat: 40.0001, t: 100, accuracy: 5 };
    expect(acceptPoint(basePrev, next)).toBe(false);
  });

  it('accepts a normal walking step', () => {
    const next = { ...basePrev, lat: 40.00009, t: 5000, accuracy: 5 }; // ~10m in 5s
    expect(acceptPoint(basePrev, next)).toBe(true);
  });
});

import { computeStats } from '@/lib/geo';

describe('computeStats', () => {
  it('returns zeros for empty points', () => {
    expect(computeStats([], 0)).toEqual({
      distanceMeters: 0,
      avgSpeedMps: 0,
      maxSpeedMps: 0,
      paceSecPerKm: null,
    });
  });

  it('does not bridge across segment boundaries', () => {
    const pts = [
      { lat: 40, lng: -73, t: 0, speed: 1, accuracy: 5, segment: 0 },
      { lat: 40.00009, lng: -73, t: 10_000, speed: 1, accuracy: 5, segment: 0 }, // ~10m in segment 0
      { lat: 41, lng: -73, t: 20_000, speed: 1, accuracy: 5, segment: 1 }, // far jump, new segment
      { lat: 41.00009, lng: -73, t: 30_000, speed: 1, accuracy: 5, segment: 1 }, // ~10m in segment 1
    ];
    const s = computeStats(pts, 30);
    expect(s.distanceMeters).toBeGreaterThan(18);
    expect(s.distanceMeters).toBeLessThan(22);
  });

  it('returns null pace when distance < 50m', () => {
    const pts = [
      { lat: 40, lng: -73, t: 0, speed: 0, accuracy: 5, segment: 0 },
      { lat: 40.00009, lng: -73, t: 5_000, speed: 0, accuracy: 5, segment: 0 },
    ];
    expect(computeStats(pts, 5).paceSecPerKm).toBeNull();
  });

  it('caps maxSpeed at 60 m/s', () => {
    const pts = [
      { lat: 40, lng: -73, t: 0, speed: 100, accuracy: 5, segment: 0 },
      { lat: 40.001, lng: -73, t: 5_000, speed: 100, accuracy: 5, segment: 0 },
    ];
    expect(computeStats(pts, 5).maxSpeedMps).toBeLessThanOrEqual(60);
  });
});
