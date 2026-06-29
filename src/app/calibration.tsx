import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalibrationStep } from '@/components/calibration/calibration-step';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useBluetooth } from '@/contexts/bluetooth-context';
import { setCalibration } from '@/services/storage';

export default function CalibrationScreen() {
  const router = useRouter();
  const { status, latestReading } = useBluetooth();
  const [initialAngle, setInitialAngle] = useState<number | null>(null);
  const [endAngle, setEndAngle] = useState<number | null>(null);

  const liveAngle = latestReading?.angle ?? 0;
  const center = initialAngle !== null && endAngle !== null ? (initialAngle + endAngle) / 2 : null;
  const canSave = center !== null;

  const handleSave = useCallback(async () => {
    if (initialAngle === null || endAngle === null) {
      return;
    }
    await setCalibration({ initialAngle, endAngle, center: (initialAngle + endAngle) / 2 });
    router.back();
  }, [initialAngle, endAngle, router]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Calibration</ThemedText>

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
            onCapture={() => setInitialAngle(liveAngle)}
          />

          <CalibrationStep
            title="End position"
            liveAngle={liveAngle}
            capturedAngle={endAngle}
            onCapture={() => setEndAngle(liveAngle)}
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
  notice: { borderRadius: Spacing.three, padding: Spacing.three },
  centerCard: { borderRadius: Spacing.three, padding: Spacing.four, alignItems: 'center', gap: Spacing.one },
  centerValue: { fontSize: 36, lineHeight: 40 },
  saveButton: {
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.five,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  disabled: { opacity: 0.5 },
  saveButtonText: { color: '#ffffff' },
});
