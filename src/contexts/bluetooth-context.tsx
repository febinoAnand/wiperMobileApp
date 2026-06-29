import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getBluetoothService } from '@/services/bluetooth';
import { setLastDeviceId } from '@/services/storage';
import type { BluetoothDeviceInfo, ConnectionStatus, WiperReading } from '@/types/wiper';

const MAX_LOG_ENTRIES = 200;

type BluetoothContextValue = {
  pairedDevices: BluetoothDeviceInfo[];
  status: ConnectionStatus;
  connectedDevice: BluetoothDeviceInfo | null;
  latestReading: WiperReading | null;
  readingLog: WiperReading[];
  refreshPairedDevices: () => Promise<void>;
  connect: (deviceId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  clearLog: () => void;
};

const BluetoothContext = createContext<BluetoothContextValue | null>(null);

export function BluetoothProvider({ children }: { children: ReactNode }) {
  const service = useMemo(() => getBluetoothService(), []);
  const [pairedDevices, setPairedDevices] = useState<BluetoothDeviceInfo[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDeviceInfo | null>(null);
  const [latestReading, setLatestReading] = useState<WiperReading | null>(null);
  const [readingLog, setReadingLog] = useState<WiperReading[]>([]);

  useEffect(() => {
    service.listBondedDevices().then(setPairedDevices).catch(() => {});

    const unsubscribeReading = service.onReading((reading) => {
      setLatestReading(reading);
      setReadingLog((previous) => [reading, ...previous].slice(0, MAX_LOG_ENTRIES));
    });
    const unsubscribeConnection = service.onConnectionChange((nextStatus, device) => {
      setStatus(nextStatus);
      setConnectedDevice(device ?? null);
    });

    return () => {
      unsubscribeReading();
      unsubscribeConnection();
    };
  }, [service]);

  const clearLog = useCallback(() => setReadingLog([]), []);

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

  const value = useMemo<BluetoothContextValue>(
    () => ({
      pairedDevices,
      status,
      connectedDevice,
      latestReading,
      readingLog,
      refreshPairedDevices,
      connect,
      disconnect,
      clearLog,
    }),
    [pairedDevices, status, connectedDevice, latestReading, readingLog, refreshPairedDevices, connect, disconnect, clearLog],
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
