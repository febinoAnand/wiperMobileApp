import { Platform } from 'react-native';

import type { BluetoothService } from './bluetooth-service';
import { createMockBluetoothService } from './mock-bluetooth-service';

export type { BluetoothService } from './bluetooth-service';

let cachedService: BluetoothService | null = null;

function loadClassicService(): BluetoothService | null {
  try {
    // Dynamic require so a missing/unlinked native module (Expo Go, dev client
    // without a native rebuild) falls back to the simulator instead of crashing.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./classic-bluetooth-service') as typeof import('./classic-bluetooth-service');
    return mod.createClassicBluetoothService();
  } catch {
    return null;
  }
}

/** Bluetooth Classic (SPP) only has a real implementation on Android; other platforms get the simulator. */
export function getBluetoothService(): BluetoothService {
  if (cachedService) {
    return cachedService;
  }

  const classicService = Platform.OS === 'android' ? loadClassicService() : null;
  cachedService = classicService ?? createMockBluetoothService();
  return cachedService;
}
