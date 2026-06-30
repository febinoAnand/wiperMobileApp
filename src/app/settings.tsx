import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeviceListItem } from '@/components/settings/device-list-item';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useBluetooth } from '@/contexts/bluetooth-context';
import { getTimeIntervalSeconds, setTimeIntervalSeconds } from '@/services/storage';

const INTERVAL_STEP_SECONDS = 10;
const MIN_INTERVAL_SECONDS = 10;
const MAX_INTERVAL_SECONDS = 600;

export default function SettingsScreen() {
  const { pairedDevices, connectedDevice, refreshPairedDevices, connect, disconnect } = useBluetooth();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [intervalSeconds, setIntervalSeconds] = useState(60);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshPairedDevices();
    } catch {
      Alert.alert('Refresh failed', "Couldn't load paired devices. Make sure Bluetooth is turned on.");
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshPairedDevices]);

  useEffect(() => {
    getTimeIntervalSeconds().then(setIntervalSeconds);
  }, []);

  const updateInterval = useCallback((next: number) => {
    const clamped = Math.min(MAX_INTERVAL_SECONDS, Math.max(MIN_INTERVAL_SECONDS, next));
    setIntervalSeconds(clamped);
    setTimeIntervalSeconds(clamped);
  }, []);

  const handleDevicePress = useCallback(
    async (deviceId: string) => {
      if (connectedDevice?.id === deviceId) {
        await disconnect();
        return;
      }
      setConnectingId(deviceId);
      try {
        await connect(deviceId);
      } catch {
        Alert.alert('Connection failed', "Couldn't connect to the selected device. Make sure it's paired and in range.");
      } finally {
        setConnectingId(null);
      }
    },
    [connectedDevice, connect, disconnect],
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Settings</ThemedText>

          <ThemedView style={styles.section}>
            <ThemedView style={styles.sectionHeader}>
              <ThemedText type="smallBold">Paired devices</ThemedText>
              <Pressable onPress={handleRefresh} disabled={isRefreshing}>
                <ThemedText type="link" themeColor="textSecondary">
                  {isRefreshing ? 'Refreshing…' : 'Refresh'}
                </ThemedText>
              </Pressable>
            </ThemedView>

            {pairedDevices.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No paired devices found. Pair your wiper module in Android Bluetooth settings, then refresh.
              </ThemedText>
            ) : (
              pairedDevices.map((device) => (
                <DeviceListItem
                  key={device.id}
                  device={device}
                  isConnected={connectedDevice?.id === device.id}
                  isBusy={connectingId === device.id}
                  onPress={() => handleDevicePress(device.id)}
                />
              ))
            )}
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText type="smallBold">Time interval</ThemedText>
            <ThemedView type="backgroundElement" style={styles.intervalRow}>
              <Pressable
                onPress={() => updateInterval(intervalSeconds - INTERVAL_STEP_SECONDS)}
                style={styles.stepButton}>
                <ThemedText type="title" style={styles.stepButtonText}>
                  −
                </ThemedText>
              </Pressable>
              <ThemedText type="title" style={styles.intervalValue}>
                {intervalSeconds}s
              </ThemedText>
              <Pressable
                onPress={() => updateInterval(intervalSeconds + INTERVAL_STEP_SECONDS)}
                style={styles.stepButton}>
                <ThemedText type="title" style={styles.stepButtonText}>
                  +
                </ThemedText>
              </Pressable>
            </ThemedView>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.five,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  section: { gap: Spacing.three },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  stepButton: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  stepButtonText: { fontSize: 28 },
  intervalValue: { fontSize: 28, lineHeight: 32 },
});
