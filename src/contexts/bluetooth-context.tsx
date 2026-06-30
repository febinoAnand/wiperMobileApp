import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getBluetoothService } from '@/services/bluetooth';
import { setLastDeviceId } from '@/services/storage';
import type { AckMessage, BluetoothDeviceInfo, ConnectionStatus, SessionReport, WiperReading } from '@/types/wiper';

type BluetoothContextValue = {
  pairedDevices: BluetoothDeviceInfo[];
  status: ConnectionStatus;
  connectedDevice: BluetoothDeviceInfo | null;
  latestReading: WiperReading | null;
  refreshPairedDevices: () => Promise<void>;
  connect: (deviceId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  write: (data: string) => Promise<void>;
  sendCommand: (payload: { cmd: string } & Record<string, unknown>, timeoutMs?: number) => Promise<AckMessage>;
  fetchSessionReport: (wiperNo: number | string, timeoutMs?: number) => Promise<SessionReport>;
};

const BluetoothContext = createContext<BluetoothContextValue | null>(null);

export function BluetoothProvider({ children }: { children: ReactNode }) {
  const service = useMemo(() => getBluetoothService(), []);
  const [pairedDevices, setPairedDevices] = useState<BluetoothDeviceInfo[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDeviceInfo | null>(null);
  const [latestReading, setLatestReading] = useState<WiperReading | null>(null);

  useEffect(() => {
    service.listBondedDevices().then(setPairedDevices).catch(() => {});

    const unsubscribeReading = service.onReading(setLatestReading);
    const unsubscribeConnection = service.onConnectionChange((nextStatus, device) => {
      setStatus(nextStatus);
      setConnectedDevice(device ?? null);
    });

    return () => {
      unsubscribeReading();
      unsubscribeConnection();
    };
  }, [service]);

  const refreshPairedDevices = useCallback(async () => {
    setPairedDevices(await service.listBondedDevices());
  }, [service]);

  const connect = useCallback(
    async (deviceId: string) => {
      await service.connect(deviceId);
      await setLastDeviceId(deviceId);
    },
    [service],
  );

  const disconnect = useCallback(async () => {
    await service.disconnect();
  }, [service]);

  const write = useCallback(
    async (data: string) => {
      await service.write(data);
    },
    [service],
  );

  const sendCommand = useCallback(
    async (payload: { cmd: string } & Record<string, unknown>, timeoutMs?: number) => service.sendCommand(payload, timeoutMs),
    [service],
  );

  const fetchSessionReport = useCallback(
    async (wiperNo: number | string, timeoutMs?: number) => service.fetchSessionReport(wiperNo, timeoutMs),
    [service],
  );

  const value = useMemo<BluetoothContextValue>(
    () => ({
      pairedDevices,
      status,
      connectedDevice,
      latestReading,
      refreshPairedDevices,
      connect,
      disconnect,
      write,
      sendCommand,
      fetchSessionReport,
    }),
    [
      pairedDevices,
      status,
      connectedDevice,
      latestReading,
      refreshPairedDevices,
      connect,
      disconnect,
      write,
      sendCommand,
      fetchSessionReport,
    ],
  );

  return <BluetoothContext.Provider value={value}>{children}</BluetoothContext.Provider>;
}

export function useBluetooth() {
  const context = useContext(BluetoothContext);
  if (!context) {
    throw new Error('useBluetooth must be used within a BluetoothProvider');
  }
  return context;
}
