import type { WiperReading } from '@/types/wiper';

/**
 * Firmware wire format: `Deg: 32.61  bar: 0.00  Count: 0  min: 0.00  max: 0.00`.
 * The device tracks its own running min/max since stream start, so this only pulls
 * angle/pressure/count - the app computes its own session-windowed min/max from `angle`.
 */
const READING_PATTERN = /Deg:\s*(-?\d+(?:\.\d+)?)\s+bar:\s*(-?\d+(?:\.\d+)?)\s+Count:\s*(-?\d+)/i;

export function parseLine(line: string): WiperReading | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(READING_PATTERN);
  if (!match) {
    return null;
  }

  return {
    angle: Number(match[1]),
    pressure: Number(match[2]),
    count: Number(match[3]),
    timestamp: Date.now(),
  };
}
