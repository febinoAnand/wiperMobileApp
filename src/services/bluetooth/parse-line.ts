import type { AckMessage, WiperReading, WipeRecord } from '@/types/wiper';

export type SessionStartData = {
  wiperNo: number | string;
  timestamp: number;
  duration: number;
  wipes: number;
  strokes: number;
};

export type ParsedMessage =
  | { kind: 'reading'; reading: WiperReading }
  | { kind: 'ack'; ack: AckMessage }
  | { kind: 'sessionStart'; data: SessionStartData }
  | { kind: 'batch'; index: number; total: number; records: WipeRecord[] }
  | { kind: 'sessionEnd' };

function parseWipeRecord(value: unknown): WipeRecord | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.seq === 'number' &&
    typeof record.dir === 'string' &&
    typeof record.angle === 'number' &&
    typeof record.pressure === 'number'
  ) {
    return { seq: record.seq, dir: record.dir, angle: record.angle, pressure: record.pressure };
  }
  return null;
}

/**
 * Firmware wire format: one JSON object per line.
 * - Idle/live reading: `{"angle":32.61,"pressure":0.00}` (may also include "raw_angle")
 * - Wipe event (after a start command): `{"type":"wipe","seq":7,"dir":"fwd","angle":68.4,"pressure":3.21}`
 * - Command ack: `{"type":"ack","cmd":"set_initial","status":"ok","angle":42.3}`
 * - Session report (after a `resend` command):
 *   `{"type":"session_start","wiper_no":2,"timestamp":...,"duration":30,"wipes":14,"strokes":7}`
 *   `{"type":"batch","index":1,"total":2,"wipes":[{"seq":1,"dir":"fwd","angle":110.2,"pressure":3.00}, ...]}`
 *   `{"type":"session_end"}`
 */
export function parseLine(line: string): ParsedMessage | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }
  const value = parsed as Record<string, unknown>;

  if (value.type === 'ack' && typeof value.cmd === 'string' && typeof value.status === 'string') {
    const ack: AckMessage = { type: 'ack', cmd: value.cmd, status: value.status };
    if (typeof value.angle === 'number') {
      ack.angle = value.angle;
    }
    return { kind: 'ack', ack };
  }

  if (
    value.type === 'session_start' &&
    (typeof value.wiper_no === 'number' || typeof value.wiper_no === 'string') &&
    typeof value.timestamp === 'number' &&
    typeof value.duration === 'number' &&
    typeof value.wipes === 'number' &&
    typeof value.strokes === 'number'
  ) {
    return {
      kind: 'sessionStart',
      data: {
        wiperNo: value.wiper_no,
        timestamp: value.timestamp,
        duration: value.duration,
        wipes: value.wipes,
        strokes: value.strokes,
      },
    };
  }

  if (
    value.type === 'batch' &&
    typeof value.index === 'number' &&
    typeof value.total === 'number' &&
    Array.isArray(value.wipes)
  ) {
    const records = value.wipes.map(parseWipeRecord).filter((record): record is WipeRecord => record !== null);
    if (records.length !== value.wipes.length) {
      console.log(`[bluetooth] batch ${value.index}/${value.total}: dropped ${value.wipes.length - records.length} malformed wipe(s)`, value.wipes);
    }
    return { kind: 'batch', index: value.index, total: value.total, records };
  }

  if (value.type === 'session_end') {
    return { kind: 'sessionEnd' };
  }

  if (typeof value.angle === 'number' && typeof value.pressure === 'number') {
    const reading: WiperReading = { angle: value.angle, pressure: value.pressure, timestamp: Date.now() };
    if (typeof value.seq === 'number') {
      reading.seq = value.seq;
    }
    if (typeof value.dir === 'string') {
      reading.dir = value.dir;
    }
    return { kind: 'reading', reading };
  }

  return null;
}
