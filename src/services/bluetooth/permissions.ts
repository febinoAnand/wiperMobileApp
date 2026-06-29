import { PermissionsAndroid } from 'react-native';

/**
 * Android 12+ (API 31+) treats BLUETOOTH_CONNECT/BLUETOOTH_SCAN as runtime permissions -
 * declaring them in the manifest isn't enough, they must be granted at runtime too.
 * ACCESS_FINE_LOCATION is still required for discovery on older Android versions.
 */
export async function ensureBluetoothPermissions(): Promise<void> {
  const results = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  ]);

  const denied = Object.values(results).some((result) => result !== PermissionsAndroid.RESULTS.GRANTED);
  if (denied) {
    throw new Error('Bluetooth permission denied');
  }
}
