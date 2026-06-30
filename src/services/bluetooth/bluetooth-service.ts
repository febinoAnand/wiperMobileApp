import type { AckMessage, BluetoothDeviceInfo, ConnectionStatus, SessionReport, WiperReading } from '@/types/wiper';

export type Unsubscribe = () => void;

export type BluetoothService = {
  listBondedDevices(): Promise<BluetoothDeviceInfo[]>;
  scanForDevices(): Promise<BluetoothDeviceInfo[]>;
  connect(deviceId: string): Promise<void>;
  disconnect(): Promise<void>;
  write(data: string): Promise<void>;
  /** Writes a `{cmd, ...}` command and resolves with the matching `{"type":"ack","cmd":...}` response. */
  sendCommand(payload: { cmd: string } & Record<string, unknown>, timeoutMs?: number): Promise<AckMessage>;
  /** Sends `{"cmd":"resend","wiper_no":wiperNo}` and assembles the session_start/batch(es)/session_end stream into a report. */
  fetchSessionReport(wiperNo: number | string, timeoutMs?: number): Promise<SessionReport>;
  onReading(callback: (reading: WiperReading) => void): Unsubscribe;
  onConnectionChange(callback: (status: ConnectionStatus, device?: BluetoothDeviceInfo) => void): Unsubscribe;
};
