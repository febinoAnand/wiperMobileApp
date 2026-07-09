import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConnectionBadge } from '@/components/dashboard/connection-badge';
import { SessionReportTable } from '@/components/dashboard/session-report-table';
import { StartSessionModal } from '@/components/dashboard/start-session-modal';
import { WiperCard } from '@/components/dashboard/wiper-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useBluetooth } from '@/contexts/bluetooth-context';
import { useCountdown } from '@/hooks/use-countdown';
import { addSessionReport, getCalibration, getTimeIntervalSeconds } from '@/services/storage';
import type { CalibrationData, DualWiperReading, SessionReport, WiperReading } from '@/types/wiper';

function fmtSeconds(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { status, connectedDevice, latestDualReading, latestReading, write, fetchSessionReport } = useBluetooth();

  // ── Shared settings ────────────────────────────────────────────────────────
  const [calibration, setCalibration] = useState<CalibrationData | null>(null);
  const [intervalSeconds, setIntervalSeconds] = useState(60);

  useFocusEffect(
    useCallback(() => {
      getCalibration().then(setCalibration);
      getTimeIntervalSeconds().then(setIntervalSeconds);
    }, []),
  );

  // ── Session state ──────────────────────────────────────────────────────────
  const [isStartModalVisible, setIsStartModalVisible] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [currentWiperNo, setCurrentWiperNo] = useState<string | null>(null);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // ── Per-wiper live data ────────────────────────────────────────────────────
  const [wLAngle, setWLAngle] = useState(0);
  const [wLWipes, setWLWipes] = useState(0);
  const [wLStrokes, setWLStrokes] = useState(0);
  const [wRAngle, setWRAngle] = useState(0);
  const [wRWipes, setWRWipes] = useState(0);
  const [wRStrokes, setWRStrokes] = useState(0);
  const [pressure, setPressure] = useState(0);

  // Render-time latch: dual reading → angles + pressure (idle stream)
  const [lastDual, setLastDual] = useState<DualWiperReading | null>(latestDualReading);
  if (latestDualReading !== lastDual) {
    setLastDual(latestDualReading);
    if (latestDualReading) {
      setWLAngle(latestDualReading.angleL);
      setWRAngle(latestDualReading.angleR);
      setPressure(latestDualReading.pressure);
    }
  }

  // Render-time latch: single wipe event → seq counters (session only)
  const [lastReading, setLastReading] = useState<WiperReading | null>(latestReading);
  if (latestReading !== lastReading) {
    setLastReading(latestReading);
    if (latestReading && typeof latestReading.seq === 'number') {
      const isRight = String(latestReading.wiper_no) === '2';
      if (isRight) {
        setWRWipes(latestReading.seq);
        setWRStrokes(Math.floor(latestReading.seq / 2));
      } else {
        setWLWipes(latestReading.seq);
        setWLStrokes(Math.floor(latestReading.seq / 2));
      }
    }
  }

  // ── Countdown + session callbacks ──────────────────────────────────────────
  const handleSessionComplete = useCallback(() => {
    setShowCompletion(true);
    setReport(null);
    if (currentWiperNo) {
      setIsLoadingReport(true);
      fetchSessionReport(currentWiperNo)
        .then((r) => {
          setReport(r);
          addSessionReport(r).catch(() => {});
        })
        .catch(() => Alert.alert('Report failed', "Couldn't fetch the session report from the device."))
        .finally(() => setIsLoadingReport(false));
    }
  }, [currentWiperNo, fetchSessionReport]);

  const countdown = useCountdown(handleSessionComplete);
  const canStart = status === 'connected' && calibration !== null;
  const startStopDisabled = !countdown.isRunning && !canStart;

  const handleReset = useCallback(() => {
    setShowCompletion(false);
    setReport(null);
    setWLWipes(0);
    setWLStrokes(0);
    setWRWipes(0);
    setWRStrokes(0);
  }, []);

  const handleConfirmStart = useCallback(
    async (wiperNo: string) => {
      setIsStartModalVisible(false);
      const command = {
        cmd: 'start',
        duration: intervalSeconds,
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
      setShowCompletion(false);
      setReport(null);
      setWLWipes(0);
      setWLStrokes(0);
      setWRWipes(0);
      setWRStrokes(0);
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <ThemedView style={styles.header}>
            <ThemedText type="subtitle">Dashboard</ThemedText>
            <ConnectionBadge
              status={status}
              deviceName={connectedDevice?.name}
              onPress={() => router.push('/settings')}
            />
          </ThemedView>

          {status === 'connected' && calibration === null && (
            <ThemedView type="backgroundElement" style={styles.notice}>
              <ThemedText type="small">Run Calibration before starting a session.</ThemedText>
            </ThemedView>
          )}

          {/* Timer display */}
          <ThemedView type="backgroundElement" style={styles.timerCard}>
            <ThemedText type="small" themeColor="textSecondary">Time interval</ThemedText>
            <ThemedText type="title" style={styles.timerDisplay}>
              {fmtSeconds(countdown.isRunning ? countdown.remainingSeconds : intervalSeconds)}
            </ThemedText>
          </ThemedView>

          {/* Both wiper cards side by side */}
          <ThemedView style={styles.cardsRow}>
            <WiperCard label="Wiper Left" angle={wLAngle} wipesCount={wLWipes} strokeCount={wLStrokes} />
            <WiperCard label="Wiper Right" angle={wRAngle} wipesCount={wRWipes} strokeCount={wRStrokes} />
          </ThemedView>

          {/* Pressure */}
          <ThemedView type="backgroundElement" style={styles.pressureCard}>
            <ThemedText type="small" themeColor="textSecondary">Pressure</ThemedText>
            <ThemedText type="title" style={styles.pressureValue}>
              {pressure.toFixed(2)}
              <ThemedText type="small" themeColor="textSecondary">{' '}bar</ThemedText>
            </ThemedText>
          </ThemedView>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <Pressable
              onPress={handleResetDevice}
              style={({ pressed }) => [styles.actionBtn, styles.resetActionBtn, pressed && styles.disabled]}>
              <ThemedText type="smallBold" style={styles.actionBtnText}>Reset</ThemedText>
            </Pressable>
            <Pressable
              onPress={countdown.isRunning ? handleStop : () => setIsStartModalVisible(true)}
              disabled={startStopDisabled}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: countdown.isRunning ? Brand.danger : Brand.primary },
                (pressed || startStopDisabled) && styles.disabled,
              ]}>
              <ThemedText type="smallBold" style={styles.actionBtnText}>
                {countdown.isRunning ? 'Stop' : 'Start'}
              </ThemedText>
            </Pressable>
          </View>

          {/* Session complete card */}
          {showCompletion && (
            <ThemedView type="backgroundElement" style={styles.completionCard}>
              <ThemedText type="subtitle">Session complete</ThemedText>

              {isLoadingReport ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
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
  timerCard: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.half,
    alignItems: 'center',
  },
  timerDisplay: { fontSize: 36, lineHeight: 40 },
  cardsRow: { flexDirection: 'row', gap: Spacing.three },
  pressureCard: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pressureValue: { fontSize: 32, lineHeight: 36 },
  actionRow: { flexDirection: 'row', gap: Spacing.two },
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
    alignItems: 'center',
  },
  resetActionBtn: { backgroundColor: '#7A8898' },
  actionBtnText: { color: '#ffffff' },
  completionCard: { borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.three },
  centered: { textAlign: 'center' },
  resetButton: {
    backgroundColor: Brand.primary,
    borderRadius: Spacing.five,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  disabled: { opacity: 0.5 },
  resetButtonText: { color: '#ffffff' },
});
