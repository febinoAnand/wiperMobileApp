import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CalibrationData, SessionReport, SessionReportEntry } from '@/types/wiper';

const KEYS = {
  calibration: 'wipeangle.calibration',
  timeIntervalSeconds: 'wipeangle.timeIntervalSeconds',
  lastDeviceId: 'wipeangle.lastDeviceId',
  sessionReports: 'wipeangle.sessionReports',
} as const;

const MAX_REPORT_ENTRIES = 50;

export const DEFAULT_TIME_INTERVAL_SECONDS = 60;

export async function getCalibration(): Promise<CalibrationData | null> {
  const raw = await AsyncStorage.getItem(KEYS.calibration);
  return raw ? (JSON.parse(raw) as CalibrationData) : null;
}

export async function setCalibration(calibration: CalibrationData): Promise<void> {
  await AsyncStorage.setItem(KEYS.calibration, JSON.stringify(calibration));
}

export async function clearCalibration(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.calibration);
}

export async function getTimeIntervalSeconds(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.timeIntervalSeconds);
  return raw ? Number(raw) : DEFAULT_TIME_INTERVAL_SECONDS;
}

export async function setTimeIntervalSeconds(seconds: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.timeIntervalSeconds, String(seconds));
}

export async function getLastDeviceId(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.lastDeviceId);
}

export async function setLastDeviceId(deviceId: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.lastDeviceId, deviceId);
}

export async function getSessionReports(): Promise<SessionReportEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.sessionReports);
  return raw ? (JSON.parse(raw) as SessionReportEntry[]) : [];
}

export async function addSessionReport(report: SessionReport): Promise<void> {
  const existing = await getSessionReports();
  const entry: SessionReportEntry = { ...report, id: `${Date.now()}` };
  const updated = [entry, ...existing].slice(0, MAX_REPORT_ENTRIES);
  await AsyncStorage.setItem(KEYS.sessionReports, JSON.stringify(updated));
}

export async function clearSessionReports(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.sessionReports);
}
