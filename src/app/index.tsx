import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AngleGauge } from '@/components/dashboard/angle-gauge';
import { ConnectionBadge } from '@/components/dashboard/connection-badge';
import { StatCard } from '@/components/dashboard/stat-card';
import { TimerControl } from '@/components/dashboard/timer-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useBluetooth } from '@/contexts/bluetooth-context';
import { useCountdown } from '@/hooks/use-countdown';
import { useWiperSession, type WiperSessionState } from '@/hooks/use-wiper-session';
import { getCalibration, getTimeIntervalSeconds } from '@/services/storage';
import type { CalibrationData } from '@/types/wiper';

export default function DashboardScreen() {
  const router = useRouter();
  const { status, connectedDevice, latestReading } = useBluetooth();

  const [calibration, setCalibration] = useState<CalibrationData | null>(null);
  const [intervalSeconds, setIntervalSeconds] = useState(60);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [summary, setSummary] = useState<WiperSessionState | null>(null);

  useFocusEffect(
    useCallback(() => {
      getCalibration().then(setCalibration);
      getTimeIntervalSeconds().then(setIntervalSeconds);
    }, []),
  );

  const center = calibration?.center ?? 0;
  const { state, processReading, reset } = useWiperSession(center, isSessionActive);

  useEffect(() => {
    if (latestReading) {
      processReading(latestReading);
    }
  }, [latestReading, processReading]);

  const handleSessionComplete = useCallback(() => {
    setIsSessionActive(false);
    setSummary(state);
  }, [state]);

  const countdown = useCountdown(handleSessionComplete);
  const canStart = status === 'connected' && calibration !== null;

  const handleStart = useCallback(() => {
    reset();
    setSummary(null);
    setIsSessionActive(true);
    countdown.start(intervalSeconds);
  }, [reset, countdown, intervalSeconds]);

  const handleStop = useCallback(() => {
    countdown.stop();
    handleSessionComplete();
  }, [countdown, handleSessionComplete]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.header}>
            <ThemedText type="subtitle">Dashboard</ThemedText>
            <ConnectionBadge status={status} deviceName={connectedDevice?.name} onPress={() => router.push('/settings')} />
          </ThemedView>

          {status === 'connected' && calibration === null && (
            <ThemedView type="backgroundElement" style={styles.notice}>
              <ThemedText type="small">Run Calibration before starting a session.</ThemedText>
            </ThemedView>
          )}

          <TimerControl
            intervalSeconds={intervalSeconds}
            remainingSeconds={countdown.remainingSeconds}
            isRunning={countdown.isRunning}
            canStart={canStart}
            onStart={handleStart}
            onStop={handleStop}
          />

          {summary ? (
            <ThemedView type="backgroundElement" style={styles.summary}>
              <ThemedText type="subtitle">Session complete</ThemedText>
              <ThemedView style={styles.statsGrid}>
                <StatCard label="Angle" value={summary.currentAngle.toFixed(1)} unit="°" />
                <StatCard label="Pressure" value={summary.pressure.toFixed(2)} unit="bar" />
              </ThemedView>
              <Pressable
                onPress={handleStart}
                disabled={!canStart}
                style={({ pressed }) => [styles.newSessionButton, (pressed || !canStart) && styles.disabled]}>
                <ThemedText type="smallBold" style={styles.newSessionText}>
                  New Session
                </ThemedText>
              </Pressable>
            </ThemedView>
          ) : (
            <>
              <AngleGauge currentAngle={state.currentAngle} />
              <ThemedView style={styles.statsGrid}>
                <StatCard label="Angle" value={state.currentAngle.toFixed(1)} unit="°" />
                <StatCard label="Pressure" value={state.pressure.toFixed(2)} unit="bar" />
              </ThemedView>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.four,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.three,
  },
  notice: { borderRadius: Spacing.three, padding: Spacing.three },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, justifyContent: 'space-between' },
  summary: { borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.three },
  newSessionButton: {
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.five,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  disabled: { opacity: 0.5 },
  newSessionText: { color: '#ffffff' },
});
