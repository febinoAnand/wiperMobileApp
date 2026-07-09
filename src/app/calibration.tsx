import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalibrationStep } from '@/components/calibration/calibration-step';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useBluetooth } from '@/contexts/bluetooth-context';
import { clearCalibration, setCalibration } from '@/services/storage';

type Sensor = 'left' | 'right';
type CapturingStep = `${Sensor}_${'initial' | 'end'}` | null;

export default function CalibrationScreen() {
  const router = useRouter();
  const { status, latestDualReading, write, sendCommand } = useBluetooth();

  const [leftInitial, setLeftInitial] = useState<number | null>(null);
  const [leftEnd, setLeftEnd] = useState<number | null>(null);
  const [rightInitial, setRightInitial] = useState<number | null>(null);
  const [rightEnd, setRightEnd] = useState<number | null>(null);
  const [capturingStep, setCapturingStep] = useState<CapturingStep>(null);
  const [isResetting, setIsResetting] = useState(false);

  const liveAngleL = latestDualReading?.angleL ?? 0;
  const liveAngleR = latestDualReading?.angleR ?? 0;

  const leftCenter = leftInitial !== null && leftEnd !== null ? (leftInitial + leftEnd) / 2 : null;
  const rightCenter = rightInitial !== null && rightEnd !== null ? (rightInitial + rightEnd) / 2 : null;
  const canSave = leftCenter !== null && rightCenter !== null;

  const capture = useCallback(
    async (sensor: Sensor, step: 'initial' | 'end') => {
      const key: CapturingStep = `${sensor}_${step}`;
      setCapturingStep(key);
      try {
        const ack = await sendCommand({ cmd: step === 'initial' ? 'set_initial' : 'set_end', sensor });
        if (ack.status !== 'ok') {
          throw new Error(`Device reported status "${ack.status}"`);
        }
        const angle = ack.angle ?? (sensor === 'left' ? liveAngleL : liveAngleR);
        if (sensor === 'left') {
          if (step === 'initial') setLeftInitial(angle);
          else setLeftEnd(angle);
        } else {
          if (step === 'initial') setRightInitial(angle);
          else setRightEnd(angle);
        }
      } catch {
        Alert.alert('Capture failed', "Couldn't get a response from the device. Make sure it's connected and try again.");
      } finally {
        setCapturingStep(null);
      }
    },
    [sendCommand, liveAngleL, liveAngleR],
  );

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    await setCalibration({
      left: { initialAngle: leftInitial!, endAngle: leftEnd!, center: leftCenter! },
      right: { initialAngle: rightInitial!, endAngle: rightEnd!, center: rightCenter! },
    });
    router.back();
  }, [leftInitial, leftEnd, leftCenter, rightInitial, rightEnd, rightCenter, canSave, router]);

  const handleResetCalibration = useCallback(async () => {
    setIsResetting(true);
    try {
      await write(JSON.stringify({ cmd: 'reset_calib' }));
    } catch {
      Alert.alert('Send failed', "Couldn't send the reset command to the device.");
    } finally {
      setIsResetting(false);
    }
    setLeftInitial(null);
    setLeftEnd(null);
    setRightInitial(null);
    setRightEnd(null);
    await clearCalibration();
  }, [write]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ThemedText type="subtitle">Calibration</ThemedText>
            <Pressable onPress={handleResetCalibration} disabled={isResetting}>
              <ThemedText type="link" themeColor="textSecondary">
                {isResetting ? 'Resetting…' : 'Reset'}
              </ThemedText>
            </Pressable>
          </View>

          {status !== 'connected' && (
            <ThemedView type="backgroundElement" style={styles.notice}>
              <ThemedText type="small">Connect a wiper device from Settings to read live angles.</ThemedText>
            </ThemedView>
          )}

          <ThemedText type="small" themeColor="textSecondary">
            Move each wiper to its extreme positions and capture both to compute the center.
          </ThemedText>

          {/* Wiper Left */}
          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.sectionLabel}>Wiper Left</ThemedText>
            <CalibrationStep
              title="Initial position"
              liveAngle={liveAngleL}
              capturedAngle={leftInitial}
              isCapturing={capturingStep === 'left_initial'}
              onCapture={() => capture('left', 'initial')}
            />
            <CalibrationStep
              title="End position"
              liveAngle={liveAngleL}
              capturedAngle={leftEnd}
              isCapturing={capturingStep === 'left_end'}
              onCapture={() => capture('left', 'end')}
            />
            <ThemedView type="backgroundElement" style={styles.centerCard}>
              <ThemedText type="small" themeColor="textSecondary">Computed center</ThemedText>
              <ThemedText type="title" style={styles.centerValue}>
                {leftCenter !== null ? `${leftCenter.toFixed(1)}°` : '—'}
              </ThemedText>
            </ThemedView>
          </View>

          {/* Wiper Right */}
          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.sectionLabel}>Wiper Right</ThemedText>
            <CalibrationStep
              title="Initial position"
              liveAngle={liveAngleR}
              capturedAngle={rightInitial}
              isCapturing={capturingStep === 'right_initial'}
              onCapture={() => capture('right', 'initial')}
            />
            <CalibrationStep
              title="End position"
              liveAngle={liveAngleR}
              capturedAngle={rightEnd}
              isCapturing={capturingStep === 'right_end'}
              onCapture={() => capture('right', 'end')}
            />
            <ThemedView type="backgroundElement" style={styles.centerCard}>
              <ThemedText type="small" themeColor="textSecondary">Computed center</ThemedText>
              <ThemedText type="title" style={styles.centerValue}>
                {rightCenter !== null ? `${rightCenter.toFixed(1)}°` : '—'}
              </ThemedText>
            </ThemedView>
          </View>

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
  section: { gap: Spacing.two },
  sectionLabel: { paddingHorizontal: Spacing.one },
  centerCard: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  centerValue: { fontSize: 28, lineHeight: 32 },
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
