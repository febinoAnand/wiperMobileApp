import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalibrationStep } from '@/components/calibration/calibration-step';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useBluetooth } from '@/contexts/bluetooth-context';
import { clearCalibration, setCalibration } from '@/services/storage';

type CapturingStep = 'initial' | 'end' | null;

export default function CalibrationScreen() {
  const router = useRouter();
  const { status, latestReading, write, sendCommand } = useBluetooth();
  const [initialAngle, setInitialAngle] = useState<number | null>(null);
  const [endAngle, setEndAngle] = useState<number | null>(null);
  const [capturingStep, setCapturingStep] = useState<CapturingStep>(null);
  const [isResetting, setIsResetting] = useState(false);

  const liveAngle = latestReading?.angle ?? 0;
  const center = initialAngle !== null && endAngle !== null ? (initialAngle + endAngle) / 2 : null;
  const canSave = center !== null;

  const capture = useCallback(
    async (step: 'initial' | 'end') => {
      setCapturingStep(step);
      try {
        const ack = await sendCommand({ cmd: step === 'initial' ? 'set_initial' : 'set_end' });
        if (ack.status !== 'ok') {
          throw new Error(`Device reported status "${ack.status}"`);
        }
        const angle = ack.angle ?? liveAngle;
        if (step === 'initial') {
          setInitialAngle(angle);
        } else {
          setEndAngle(angle);
        }
      } catch {
        Alert.alert('Capture failed', "Couldn't get a response from the device. Make sure it's connected and try again.");
      } finally {
        setCapturingStep(null);
      }
    },
    [sendCommand, liveAngle],
  );

  const handleSave = useCallback(async () => {
    if (initialAngle === null || endAngle === null) {
      return;
    }
    await setCalibration({ initialAngle, endAngle, center: (initialAngle + endAngle) / 2 });
    router.back();
  }, [initialAngle, endAngle, router]);

  const handleResetCalibration = useCallback(async () => {
    setIsResetting(true);
    try {
      await write(JSON.stringify({ cmd: 'reset_calib' }));
    } catch {
      Alert.alert('Send failed', "Couldn't send the reset command to the device.");
    } finally {
      setIsResetting(false);
    }
    setInitialAngle(null);
    setEndAngle(null);
    await clearCalibration();
  }, [write]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedView style={styles.header}>
            <ThemedText type="subtitle">Calibration</ThemedText>
            <Pressable onPress={handleResetCalibration} disabled={isResetting}>
              <ThemedText type="link" themeColor="textSecondary">
                {isResetting ? 'Resetting…' : 'Reset'}
              </ThemedText>
            </Pressable>
          </ThemedView>

          {status !== 'connected' && (
            <ThemedView type="backgroundElement" style={styles.notice}>
              <ThemedText type="small">Connect a wiper device from Settings to read live angles.</ThemedText>
            </ThemedView>
          )}

          <ThemedText type="small" themeColor="textSecondary">
            Move the wiper to each extreme and capture both positions to compute the center.
          </ThemedText>

          <CalibrationStep
            title="Initial position"
            liveAngle={liveAngle}
            capturedAngle={initialAngle}
            isCapturing={capturingStep === 'initial'}
            onCapture={() => capture('initial')}
          />

          <CalibrationStep
            title="End position"
            liveAngle={liveAngle}
            capturedAngle={endAngle}
            isCapturing={capturingStep === 'end'}
            onCapture={() => capture('end')}
          />

          <ThemedView type="backgroundElement" style={styles.centerCard}>
            <ThemedText type="small" themeColor="textSecondary">
              Computed center
            </ThemedText>
            <ThemedText type="title" style={styles.centerValue}>
              {center !== null ? `${center.toFixed(1)}°` : '—'}
            </ThemedText>
          </ThemedView>

          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={({ pressed }) => [styles.saveButton, (pressed || !canSave) && styles.disabled]}>
            <ThemedText type="smallBold" style={styles.saveButtonText}>
              Save calibration
            </ThemedText>
          </Pressable>
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
    gap: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notice: { borderRadius: Spacing.three, padding: Spacing.three },
  centerCard: { borderRadius: Spacing.three, padding: Spacing.four, alignItems: 'center', gap: Spacing.one },
  centerValue: { fontSize: 36, lineHeight: 40 },
  saveButton: {
    backgroundColor: Brand.primary,
    borderRadius: Spacing.five,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  disabled: { opacity: 0.5 },
  saveButtonText: { color: '#ffffff' },
});
