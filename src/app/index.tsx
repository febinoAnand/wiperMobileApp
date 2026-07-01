import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AngleGauge } from '@/components/dashboard/angle-gauge';
import { ConnectionBadge } from '@/components/dashboard/connection-badge';
import { SessionReportTable } from '@/components/dashboard/session-report-table';
import { StartSessionModal } from '@/components/dashboard/start-session-modal';
import { StatCard } from '@/components/dashboard/stat-card';
import { TimerControl } from '@/components/dashboard/timer-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useBluetooth } from '@/contexts/bluetooth-context';
import { useCountdown } from '@/hooks/use-countdown';
import { addSessionReport, getCalibration, getTimeIntervalSeconds } from '@/services/storage';
import type { CalibrationData, SessionReport } from '@/types/wiper';

type LiveReading = { angle: number; pressure: number };
type SessionSnapshot = LiveReading & { strokeCount: number; wipesCount: number };

export default function DashboardScreen() {
  const router = useRouter();
  const { status, connectedDevice, latestReading, write, fetchSessionReport } = useBluetooth();

  const [calibration, setCalibration] = useState<CalibrationData | null>(null);
  const [intervalSeconds, setIntervalSeconds] = useState(60);
  const [summary, setSummary] = useState<SessionSnapshot | null>(null);
  const [isStartModalVisible, setIsStartModalVisible] = useState(false);
  const [wipesCount, setWipesCount] = useState(0);
  const [strokeCount, setStrokeCount] = useState(0);
  const [lastProcessedReading, setLastProcessedReading] = useState(latestReading);
  const [currentWiperNo, setCurrentWiperNo] = useState<string | null>(null);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getCalibration().then(setCalibration);
      getTimeIntervalSeconds().then(setIntervalSeconds);
    }, []),
  );

  const live = useMemo<LiveReading>(
    () => ({
      angle: latestReading?.angle ?? 0,
      pressure: latestReading?.pressure ?? 0,
    }),
    [latestReading],
  );

  // Wipe events (`seq`) only arrive once a session is running - latch the count so it
  // doesn't reset back to 0 when a plain angle/pressure reading arrives in between.
  if (latestReading !== lastProcessedReading) {
    setLastProcessedReading(latestReading);
    if (typeof latestReading?.seq === 'number') {
      setWipesCount(latestReading.seq);
      setStrokeCount(Math.floor(latestReading.seq / 2));
    }
  }

  const handleSessionComplete = useCallback(() => {
    setSummary({ ...live, strokeCount, wipesCount });
    setReport(null);
    if (currentWiperNo) {
      setIsLoadingReport(true);
      fetchSessionReport(currentWiperNo)
        .then((fetchedReport) => {
          setReport(fetchedReport);
          addSessionReport(fetchedReport).catch(() => {});
        })
        .catch(() => Alert.alert('Report failed', "Couldn't fetch the session report from the device."))
        .finally(() => setIsLoadingReport(false));
    }
  }, [live, strokeCount, wipesCount, currentWiperNo, fetchSessionReport]);

  const countdown = useCountdown(handleSessionComplete);
  const canStart = status === 'connected' && calibration !== null;

  const openStartModal = useCallback(() => setIsStartModalVisible(true), []);
  const handleReset = useCallback(() => {
    setSummary(null);
    setWipesCount(0);
    setStrokeCount(0);
    setReport(null);
  }, []);

  const handleConfirmStart = useCallback(
    async (wiperNo: string) => {
      setIsStartModalVisible(false);
      const command = {
        cmd: 'start',
        duration: intervalSeconds,
        // Numeric input (e.g. "1") is sent as a number to match the device's sample payload;
        // anything else (e.g. "A1") is sent as-is.
        wiper_no: /^\d+$/.test(wiperNo) ? Number(wiperNo) : wiperNo,
        timestamp: Math.floor(Date.now() / 1000),
      };
      try {
        await write(JSON.stringify(command));
      } catch {
        Alert.alert('Send failed', "Couldn't send the start command to the device.");
        return;
      }
      setCurrentWiperNo(wiperNo);
      setSummary(null);
      setReport(null);
      setWipesCount(0);
      setStrokeCount(0);
      countdown.start(intervalSeconds);
    },
    [intervalSeconds, write, countdown],
  );

  const handleResetDevice = useCallback(async () => {
    try {
      await write(JSON.stringify({ cmd: 'reset' }));
    } catch {
      Alert.alert('Send failed', "Couldn't send the reset command to the device.");
    }
  }, [write]);

  const handleStop = useCallback(async () => {
    try {
      await write(JSON.stringify({ cmd: 'stop' }));
    } catch {
      Alert.alert('Send failed', "Couldn't send the stop command to the device.");
    }
    countdown.stop();
    handleSessionComplete();
  }, [write, countdown, handleSessionComplete]);

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
            onStart={openStartModal}
            onStop={handleStop}
            onReset={handleResetDevice}
          />

          {summary ? (
            <ThemedView type="backgroundElement" style={styles.summary}>
              <ThemedText type="subtitle">Session complete</ThemedText>
              <ThemedView style={styles.statsGrid}>
                <StatCard label="Angle" value={summary.angle.toFixed(1)} unit="°" />
                <StatCard label="Pressure" value={summary.pressure.toFixed(2)} unit="bar" />
              </ThemedView>
              <ThemedView style={styles.statsGrid}>
                <StatCard label="Stroke" value={String(summary.strokeCount)} />
                <StatCard label="Wipes count" value={String(summary.wipesCount)} />
              </ThemedView>

              {isLoadingReport ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.lastReceived}>
                  Loading report…
                </ThemedText>
              ) : (
                report && <SessionReportTable records={report.records} />
              )}

              <Pressable
                onPress={handleReset}
                style={({ pressed }) => [styles.resetButton, pressed && styles.disabled]}>
                <ThemedText type="smallBold" style={styles.resetButtonText}>
                  Reset
                </ThemedText>
              </Pressable>
            </ThemedView>
          ) : (
            <>
              <AngleGauge angle={live.angle} />
              <ThemedView style={styles.statsGrid}>
                <StatCard label="Angle" value={live.angle.toFixed(1)} unit="°" />
                <StatCard label="Pressure" value={live.pressure.toFixed(2)} unit="bar" />
              </ThemedView>
              <ThemedView style={styles.statsGrid}>
                <StatCard label="Stroke" value={String(strokeCount)} />
                <StatCard label="Wipes count" value={String(wipesCount)} />
              </ThemedView>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
      <StartSessionModal
        visible={isStartModalVisible}
        onCancel={() => setIsStartModalVisible(false)}
        onConfirm={handleConfirmStart}
      />
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
  lastReceived: { textAlign: 'center' },
  summary: { borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.three },
  resetButton: {
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.five,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  disabled: { opacity: 0.5 },
  resetButtonText: { color: '#ffffff' },
});
