import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useBluetooth } from '@/contexts/bluetooth-context';
import { clearCalibration, setCalibration } from '@/services/storage';

type Sensor = 'left' | 'right';
type CapturingStep = `${Sensor}_${'initial' | 'end'}` | null;

function AngleValue({ captured, live }: { captured: number | null; live: number }) {
  return (
    <View style={styles.angleBlock}>
      <ThemedText type="title" style={styles.angleLive}>
        {(captured ?? live).toFixed(1)}°
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {captured !== null ? 'Captured' : 'Live'}
      </ThemedText>
    </View>
  );
}

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
        if (ack.status !== 'ok') throw new Error(`Device reported status "${ack.status}"`);
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

  const isBusy = capturingStep !== null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
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

          {/* Initial Position */}
          <StepCard
            title="Initial Position"
            leftCaptured={leftInitial}
            rightCaptured={rightInitial}
            liveAngleL={liveAngleL}
            liveAngleR={liveAngleR}
            capturingLeft={capturingStep === 'left_initial'}
            capturingRight={capturingStep === 'right_initial'}
            isBusy={isBusy}
            onCaptureLeft={() => capture('left', 'initial')}
            onCaptureRight={() => capture('right', 'initial')}
          />

          {/* End Position */}
          <StepCard
            title="End Position"
            leftCaptured={leftEnd}
            rightCaptured={rightEnd}
            liveAngleL={liveAngleL}
            liveAngleR={liveAngleR}
            capturingLeft={capturingStep === 'left_end'}
            capturingRight={capturingStep === 'right_end'}
            isBusy={isBusy}
            onCaptureLeft={() => capture('left', 'end')}
            onCaptureRight={() => capture('right', 'end')}
          />

          {/* Computed Center */}
          <ThemedView type="backgroundElement" style={styles.centerCard}>
            <ThemedText type="smallBold" style={styles.cardTitle}>Computed Center</ThemedText>
            <View style={styles.row}>
              <View style={styles.sensorCol}>
                <ThemedText type="small" themeColor="textSecondary">Left Wiper</ThemedText>
                <ThemedText type="title" style={styles.angleLive}>
                  {leftCenter !== null ? `${leftCenter.toFixed(1)}°` : '—'}
                </ThemedText>
              </View>
              <View style={styles.divider} />
              <View style={styles.sensorCol}>
                <ThemedText type="small" themeColor="textSecondary">Right Wiper</ThemedText>
                <ThemedText type="title" style={styles.angleLive}>
                  {rightCenter !== null ? `${rightCenter.toFixed(1)}°` : '—'}
                </ThemedText>
              </View>
            </View>
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

type StepCardProps = {
  title: string;
  leftCaptured: number | null;
  rightCaptured: number | null;
  liveAngleL: number;
  liveAngleR: number;
  capturingLeft: boolean;
  capturingRight: boolean;
  isBusy: boolean;
  onCaptureLeft: () => void;
  onCaptureRight: () => void;
};

function StepCard({
  title,
  leftCaptured,
  rightCaptured,
  liveAngleL,
  liveAngleR,
  capturingLeft,
  capturingRight,
  isBusy,
  onCaptureLeft,
  onCaptureRight,
}: StepCardProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.stepCard}>
      <ThemedText type="smallBold" style={styles.cardTitle}>{title}</ThemedText>
      <View style={styles.row}>
        {/* Left wiper */}
        <View style={styles.sensorCol}>
          <ThemedText type="small" themeColor="textSecondary">Left Wiper</ThemedText>
          <AngleValue captured={leftCaptured} live={liveAngleL} />
          <Pressable
            onPress={onCaptureLeft}
            disabled={isBusy}
            style={({ pressed }) => [styles.captureBtn, (pressed || isBusy) && styles.disabled]}>
            <ThemedText type="smallBold" style={styles.captureBtnText}>
              {capturingLeft ? 'Wait…' : leftCaptured !== null ? 'Recapture' : 'Capture'}
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.divider} />

        {/* Right wiper */}
        <View style={styles.sensorCol}>
          <ThemedText type="small" themeColor="textSecondary">Right Wiper</ThemedText>
          <AngleValue captured={rightCaptured} live={liveAngleR} />
          <Pressable
            onPress={onCaptureRight}
            disabled={isBusy}
            style={({ pressed }) => [styles.captureBtn, (pressed || isBusy) && styles.disabled]}>
            <ThemedText type="smallBold" style={styles.captureBtnText}>
              {capturingRight ? 'Wait…' : rightCaptured !== null ? 'Recapture' : 'Capture'}
            </ThemedText>
          </Pressable>
        </View>
      </View>
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
  stepCard: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  centerCard: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  cardTitle: { textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  sensorCol: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#7A889820',
    marginVertical: Spacing.one,
  },
  angleBlock: { alignItems: 'center', gap: Spacing.half },
  angleLive: { fontSize: 28, lineHeight: 32 },
  captureBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    backgroundColor: Brand.primary,
  },
  captureBtnText: { color: '#ffffff' },
  disabled: { opacity: 0.5 },
  saveButton: {
    backgroundColor: Brand.primary,
    borderRadius: Spacing.five,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  saveButtonText: { color: '#ffffff' },
});
