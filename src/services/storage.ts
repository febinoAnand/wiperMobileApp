import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CalibrationData } from '@/types/wiper';

const KEYS = {
  calibration: 'wipeangle.calibration',
  timeIntervalSeconds: 'wipeangle.timeIntervalSeconds',
  lastDeviceId: 'wipeangle.lastDeviceId',
} as const;

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
