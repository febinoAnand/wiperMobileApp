import type { BluetoothDeviceInfo, ConnectionStatus, WiperReading } from '@/types/wiper';

export type Unsubscribe = () => void;

export type BluetoothService = {
  listBondedDevices(): Promise<BluetoothDeviceInfo[]>;
  scanForDevices(): Promise<BluetoothDeviceInfo[]>;
  connect(deviceId: string): Promise<void>;
  disconnect(): Promise<void>;
  onReading(callback: (reading: WiperReading) => void): Unsubscribe;
  onConnectionChange(callback: (status: ConnectionStatus, device?: BluetoothDeviceInfo) => void): Unsubscribe;
};
