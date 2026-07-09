import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CalibrationData, DualSessionReport, DualSessionReportEntry, SessionReport, SessionReportEntry } from '@/types/wiper';

const KEYS = {
  calibration: 'wipeangle.calibration',
  timeIntervalSeconds: 'wipeangle.timeIntervalSeconds',
  lastDeviceId: 'wipeangle.lastDeviceId',
  selectedDevice: 'wipeangle.selectedDevice',
  sessionReports: 'wipeangle.sessionReports',
  dualSessionReports: 'wipeangle.dualSessionReports',
} as const;

export type SelectedDevice = { id: string; name: string };

const MAX_REPORT_ENTRIES = 50;

export const DEFAULT_TIME_INTERVAL_SECONDS = 60;

export async function getCalibration(): Promise<CalibrationData | null> {
  const raw = await AsyncStorage.getItem(KEYS.calibration);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as CalibrationData;
  // Reject old single-wiper calibration data (pre-dual-sensor schema)
  if (!parsed?.left || !parsed?.right) return null;
  return parsed;
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

export async function getSelectedDevice(): Promise<SelectedDevice | null> {
  const raw = await AsyncStorage.getItem(KEYS.selectedDevice);
  return raw ? (JSON.parse(raw) as SelectedDevice) : null;
}

export async function setSelectedDevice(device: SelectedDevice): Promise<void> {
  await AsyncStorage.setItem(KEYS.selectedDevice, JSON.stringify(device));
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

export async function getDualSessionReports(): Promise<DualSessionReportEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.dualSessionReports);
  return raw ? (JSON.parse(raw) as DualSessionReportEntry[]) : [];
}

export async function addDualSessionReport(report: DualSessionReport): Promise<void> {
  const existing = await getDualSessionReports();
  const entry: DualSessionReportEntry = { ...report, id: `${Date.now()}` };
  const updated = [entry, ...existing].slice(0, MAX_REPORT_ENTRIES);
  await AsyncStorage.setItem(KEYS.dualSessionReports, JSON.stringify(updated));
}

export async function clearDualSessionReports(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.dualSessionReports);
}
