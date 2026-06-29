import RNBluetoothClassic, { type BluetoothDevice } from 'react-native-bluetooth-classic';

import type { BluetoothDeviceInfo, ConnectionStatus, WiperReading } from '@/types/wiper';

import type { BluetoothService, Unsubscribe } from './bluetooth-service';
import { parseLine } from './parse-line';
import { ensureBluetoothPermissions } from './permissions';

function toDeviceInfo(device: BluetoothDevice): BluetoothDeviceInfo {
  return { id: device.address, name: device.name || device.address, bonded: Boolean(device.bonded) };
}

export function createClassicBluetoothService(): BluetoothService {
  let connectedDevice: BluetoothDevice | null = null;
  let dataSubscription: { remove: () => void } | null = null;
  let buffer = '';

  let readingListeners: ((reading: WiperReading) => void)[] = [];
  let connectionListeners: ((status: ConnectionStatus, device?: BluetoothDeviceInfo) => void)[] = [];

  function emitReading(reading: WiperReading) {
    readingListeners.forEach((listener) => listener(reading));
  }

  function emitConnectionChange(status: ConnectionStatus, device?: BluetoothDeviceInfo) {
    connectionListeners.forEach((listener) => listener(status, device));
  }

  function handleData(event: { data: string }) {
    buffer += event.data;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const reading = parseLine(line);
      if (reading) {
        emitReading(reading);
      }
    }
  }

  return {
    async listBondedDevices() {
      await ensureBluetoothPermissions();
      const devices = await RNBluetoothClassic.getBondedDevices();
      return devices.map(toDeviceInfo);
    },

    async scanForDevices() {
      await ensureBluetoothPermissions();
      const devices = await RNBluetoothClassic.startDiscovery();
      return devices.map(toDeviceInfo);
    },

    async connect(deviceId: string) {
      emitConnectionChange('connecting');
      try {
        await ensureBluetoothPermissions();
        const device = await RNBluetoothClassic.connectToDevice(deviceId);
        connectedDevice = device;
        buffer = '';
        dataSubscription = device.onDataReceived(handleData);
        emitConnectionChange('connected', toDeviceInfo(device));
      } catch (error) {
        emitConnectionChange('disconnected');
        throw error;
      }
    },

    async disconnect() {
      dataSubscription?.remove();
      dataSubscription = null;
      await connectedDevice?.disconnect();
      connectedDevice = null;
      emitConnectionChange('disconnected');
    },

    onReading(callback): Unsubscribe {
      readingListeners.push(callback);
      return () => {
        readingListeners = readingListeners.filter((listener) => listener !== callback);
      };
    },

    onConnectionChange(callback): Unsubscribe {
      connectionListeners.push(callback);
      return () => {
        connectionListeners = connectionListeners.filter((listener) => listener !== callback);
      };
    },
  };
}
