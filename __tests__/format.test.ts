import { formatDistance, formatDuration, formatSpeed, formatPace } from '@/lib/format';

describe('format', () => {
  it('formatDistance shows m under 1km and km with 2 decimals otherwise', () => {
    expect(formatDistance(450)).toBe('450 m');
    expect(formatDistance(1500)).toBe('1.50 km');
    expect(formatDistance(12345)).toBe('12.35 km');
  });
  it('formatDuration uses mm:ss under 1h and hh:mm:ss otherwise', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(3725)).toBe('01:02:05');
  });
  it('formatSpeed converts m/s to km/h with 1 decimal', () => {
    expect(formatSpeed(10)).toBe('36.0 km/h');
  });
  it('formatPace returns --:-- when null', () => {
    expect(formatPace(null)).toBe('--:--');
    expect(formatPace(300)).toBe('5:00 /km');
  });
});
