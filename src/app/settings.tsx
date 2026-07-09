import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useBluetooth } from '@/contexts/bluetooth-context';
import {
  getSelectedDevice,
  getTimeIntervalSeconds,
  setSelectedDevice,
  setTimeIntervalSeconds,
  type SelectedDevice,
} from '@/services/storage';
import type { BluetoothDeviceInfo } from '@/types/wiper';

const MIN_INTERVAL_SECONDS = 10;
const MAX_INTERVAL_SECONDS = 300; // 5 minutes
const SEC_STEP = 10;

export default function SettingsScreen() {
  const { pairedDevices, refreshPairedDevices } = useBluetooth();
  const [isDeviceModalVisible, setIsDeviceModalVisible] = useState(false);
  const [savedDevice, setSavedDevice] = useState<SelectedDevice | null>(null);
  const [intervalSeconds, setIntervalSeconds] = useState(60);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    getTimeIntervalSeconds().then(setIntervalSeconds);
    getSelectedDevice().then(setSavedDevice);
  }, []);

  const handleOpenModal = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshPairedDevices();
    } catch {
      // Non-fatal — show whatever is already loaded
    } finally {
      setIsRefreshing(false);
    }
    setIsDeviceModalVisible(true);
  }, [refreshPairedDevices]);

  const handleRefreshInModal = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshPairedDevices();
    } catch {
      Alert.alert('Refresh failed', "Couldn't load paired devices. Make sure Bluetooth is turned on.");
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshPairedDevices]);

  const handleSelectDevice = useCallback(async (device: BluetoothDeviceInfo) => {
    const toSave: SelectedDevice = { id: device.id, name: device.name };
    await setSelectedDevice(toSave);
    setSavedDevice(toSave);
    setIsDeviceModalVisible(false);
  }, []);

  const updateInterval = useCallback((next: number) => {
    const clamped = Math.min(MAX_INTERVAL_SECONDS, Math.max(MIN_INTERVAL_SECONDS, next));
    setIntervalSeconds(clamped);
    setTimeIntervalSeconds(clamped);
  }, []);

  const minutes = Math.floor(intervalSeconds / 60);
  const secs = intervalSeconds % 60;

  const adjustMinutes = useCallback((delta: number) => {
    const nextMin = Math.min(5, Math.max(0, minutes + delta));
    const nextSec = nextMin === 5 ? 0 : secs;
    updateInterval(nextMin * 60 + nextSec);
  }, [minutes, secs, updateInterval]);

  const adjustSeconds = useCallback((delta: number) => {
    if (minutes === 5) return;
    const nextSec = Math.min(50, Math.max(0, secs + delta * SEC_STEP));
    updateInterval(minutes * 60 + nextSec);
  }, [minutes, secs, updateInterval]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Settings</ThemedText>

          {/* Bluetooth device selection */}
          <ThemedView style={styles.section}>
            <ThemedText type="smallBold">Bluetooth device</ThemedText>
            <Pressable
              onPress={handleOpenModal}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.deviceRow}>
                <View style={styles.deviceInfo}>
                  <ThemedText type="small" themeColor="textSecondary">Selected device</ThemedText>
                  <ThemedText type="smallBold">
                    {savedDevice?.name ?? 'Not selected'}
                  </ThemedText>
                  {savedDevice && (
                    <ThemedText type="small" themeColor="textSecondary">{savedDevice.id}</ThemedText>
                  )}
                </View>
                <ThemedText type="title" themeColor="textSecondary" style={styles.chevron}>›</ThemedText>
              </ThemedView>
            </Pressable>
          </ThemedView>

          {/* Time interval */}
          <ThemedView style={styles.section}>
            <ThemedText type="smallBold">Time interval</ThemedText>
            <ThemedView type="backgroundElement" style={styles.intervalCard}>
              {/* Minutes group */}
              <View style={styles.intervalGroup}>
                <View style={styles.stepRow}>
                  <Pressable
                    onPress={() => adjustMinutes(-1)}
                    disabled={minutes === 0}
                    style={styles.stepButton}>
                    <ThemedText type="title" style={[styles.stepButtonText, minutes === 0 && styles.stepDisabled]}>−</ThemedText>
                  </Pressable>
                  <ThemedText type="title" style={styles.unitValue}>
                    {String(minutes).padStart(2, '0')}
                  </ThemedText>
                  <Pressable
                    onPress={() => adjustMinutes(1)}
                    disabled={minutes === 5}
                    style={styles.stepButton}>
                    <ThemedText type="title" style={[styles.stepButtonText, minutes === 5 && styles.stepDisabled]}>+</ThemedText>
                  </Pressable>
                </View>
                <ThemedText type="small" themeColor="textSecondary">min</ThemedText>
              </View>

              <View style={styles.colonGroup}>
                <ThemedText type="title" style={styles.colonSep}>:</ThemedText>
                <ThemedText type="small" style={styles.colonSpacer}> </ThemedText>
              </View>

              {/* Seconds group */}
              <View style={styles.intervalGroup}>
                <View style={styles.stepRow}>
                  <Pressable
                    onPress={() => adjustSeconds(-1)}
                    disabled={secs === 0 || minutes === 5}
                    style={styles.stepButton}>
                    <ThemedText type="title" style={[styles.stepButtonText, (secs === 0 || minutes === 5) && styles.stepDisabled]}>−</ThemedText>
                  </Pressable>
                  <ThemedText type="title" style={styles.unitValue}>
                    {String(secs).padStart(2, '0')}
                  </ThemedText>
                  <Pressable
                    onPress={() => adjustSeconds(1)}
                    disabled={secs >= 50 || minutes === 5}
                    style={styles.stepButton}>
                    <ThemedText type="title" style={[styles.stepButtonText, (secs >= 50 || minutes === 5) && styles.stepDisabled]}>+</ThemedText>
                  </Pressable>
                </View>
                <ThemedText type="small" themeColor="textSecondary">sec</ThemedText>
              </View>
            </ThemedView>
            <ThemedText type="small" themeColor="textSecondary">Max 5:00 · seconds step 10</ThemedText>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>

      {/* Device selection modal */}
      <Modal
        visible={isDeviceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDeviceModalVisible(false)}>
        <View style={styles.overlay}>
          <ThemedView type="backgroundElement" style={styles.modalCard}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <ThemedText type="smallBold">Select device</ThemedText>
              <View style={styles.modalHeaderActions}>
                <Pressable onPress={handleRefreshInModal} disabled={isRefreshing}>
                  <ThemedText type="link" themeColor="textSecondary">
                    {isRefreshing ? 'Refreshing…' : 'Refresh'}
                  </ThemedText>
                </Pressable>
                <Pressable onPress={() => setIsDeviceModalVisible(false)}>
                  <ThemedText type="link" themeColor="textSecondary">Cancel</ThemedText>
                </Pressable>
              </View>
            </View>

            {/* Device list */}
            {pairedDevices.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                No paired devices found. Pair your wiper module in Android Bluetooth settings, then refresh.
              </ThemedText>
            ) : (
              <ScrollView
                style={styles.deviceList}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                {pairedDevices.map((device) => {
                  const isSelected = savedDevice?.id === device.id;
                  return (
                    <Pressable
                      key={device.id}
                      onPress={() => handleSelectDevice(device)}
                      style={({ pressed }) => [styles.deviceItem, pressed && styles.pressed]}>
                      <View style={styles.deviceItemInfo}>
                        <ThemedText type="smallBold">{device.name}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">{device.id}</ThemedText>
                      </View>
                      {isSelected && (
                        <ThemedText type="smallBold" style={styles.checkmark}>✓</ThemedText>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </ThemedView>
        </View>
      </Modal>
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
  pressed: { opacity: 0.7 },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  deviceInfo: { gap: Spacing.half, flex: 1 },
  chevron: { fontSize: 22, lineHeight: 26 },
  intervalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  intervalGroup: { alignItems: 'center', gap: Spacing.one },
  colonGroup: { alignItems: 'center', gap: Spacing.one, marginHorizontal: Spacing.one },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepButton: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  stepButtonText: { fontSize: 28, lineHeight: 32 },
  stepDisabled: { opacity: 0.25 },
  unitValue: { fontSize: 28, lineHeight: 32, minWidth: 48, textAlign: 'center' },
  colonSep: { fontSize: 32, lineHeight: 32 },
  colonSpacer: { opacity: 0, lineHeight: 20 },
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  deviceList: { flexShrink: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  modalHeaderActions: { flexDirection: 'row', gap: Spacing.three },
  emptyText: { textAlign: 'center', paddingVertical: Spacing.three },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  deviceItemInfo: { gap: Spacing.half, flex: 1 },
  checkmark: { color: Brand.primary, fontSize: 18 },
});
