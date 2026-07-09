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
import { addDualSessionReport, getCalibration, getSelectedDevice, getTimeIntervalSeconds } from '@/services/storage';
import type { CalibrationData, DualWiperReading, SessionReport, WiperReading } from '@/types/wiper';

type WiperTab = 'left' | 'right';

function fmtSeconds(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { status, connectedDevice, latestDualReading, latestReading, write, connect, disconnect, fetchSessionReport } = useBluetooth();

  // ── Shared settings ────────────────────────────────────────────────────────
  const [calibration, setCalibration] = useState<CalibrationData | null>(null);
  const [intervalSeconds, setIntervalSeconds] = useState(60);
  const [savedDeviceName, setSavedDeviceName] = useState<string | undefined>(undefined);
  const [savedDeviceId, setSavedDeviceId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getCalibration().then(setCalibration);
      getTimeIntervalSeconds().then(setIntervalSeconds);
      getSelectedDevice().then((d) => {
        setSavedDeviceName(d?.name);
        setSavedDeviceId(d?.id ?? null);
      });
    }, []),
  );

  // ── Session state ──────────────────────────────────────────────────────────
  const [isStartModalVisible, setIsStartModalVisible] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [currentLeftWiperNo, setCurrentLeftWiperNo] = useState<string | null>(null);
  const [currentRightWiperNo, setCurrentRightWiperNo] = useState<string | null>(null);
  const [leftReport, setLeftReport] = useState<SessionReport | null>(null);
  const [rightReport, setRightReport] = useState<SessionReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [completionTab, setCompletionTab] = useState<WiperTab>('left');

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
      const isRight = latestReading.wiper === 'right' || String(latestReading.wiper_no) === '2';
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
    setLeftReport(null);
    setRightReport(null);
    setCompletionTab('left');
    if (currentLeftWiperNo && currentRightWiperNo) {
      setIsLoadingReport(true);
      Promise.all([
        fetchSessionReport(currentLeftWiperNo),
        fetchSessionReport(currentRightWiperNo),
      ])
        .then(([lReport, rReport]) => {
          setLeftReport(lReport);
          setRightReport(rReport);
          addDualSessionReport({
            timestamp: Math.floor(Date.now() / 1000),
            left: lReport,
            right: rReport,
          }).catch(() => {});
        })
        .catch(() => Alert.alert('Report failed', "Couldn't fetch the session report from the device."))
        .finally(() => setIsLoadingReport(false));
    }
  }, [currentLeftWiperNo, currentRightWiperNo, fetchSessionReport]);

  const countdown = useCountdown(handleSessionComplete);
  const canStart = status === 'connected' && calibration !== null;
  const startStopDisabled = !countdown.isRunning && !canStart;

  const handleReset = useCallback(() => {
    setShowCompletion(false);
    setLeftReport(null);
    setRightReport(null);
    setWLWipes(0);
    setWLStrokes(0);
    setWRWipes(0);
    setWRStrokes(0);
  }, []);

  const handleConfirmStart = useCallback(
    async (leftWiperNo: string, rightWiperNo: string) => {
      setIsStartModalVisible(false);
      const toNum = (v: string) => (/^\d+$/.test(v) ? Number(v) : v);
      const command = {
        cmd: 'start',
        duration: intervalSeconds,
        wiper_no_left: toNum(leftWiperNo),
        wiper_no_right: toNum(rightWiperNo),
        timestamp: Math.floor(Date.now() / 1000),
      };
      try {
        await write(JSON.stringify(command));
      } catch {
        Alert.alert('Send failed', "Couldn't send the start command to the device.");
        return;
      }
      setCurrentLeftWiperNo(leftWiperNo);
      setCurrentRightWiperNo(rightWiperNo);
      setShowCompletion(false);
      setLeftReport(null);
      setRightReport(null);
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

  const handleBadgePress = useCallback(async () => {
    if (status === 'connected') {
      try {
        await disconnect();
      } catch {
        Alert.alert('Disconnect failed', "Couldn't disconnect from the device.");
      }
    } else if (status === 'disconnected' && savedDeviceId) {
      try {
        await connect(savedDeviceId);
      } catch {
        Alert.alert('Connection failed', "Couldn't connect. Make sure the device is in range and Bluetooth is on.");
      }
    } else {
      router.push('/settings');
    }
  }, [status, savedDeviceId, connect, disconnect, router]);

  const activeReport = completionTab === 'left' ? leftReport : rightReport;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <ThemedView style={styles.header}>
            <ThemedText type="subtitle">Dashboard</ThemedText>
            <ConnectionBadge
              status={status}
              deviceName={connectedDevice?.name ?? savedDeviceName}
              onPress={handleBadgePress}
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
            <WiperCard label="Wiper Left" angle={wLAngle} wipesCount={wLWipes} strokeCount={wLStrokes} centerAngle={calibration?.left.center} />
            <WiperCard label="Wiper Right" angle={wRAngle} wipesCount={wRWipes} strokeCount={wRStrokes} centerAngle={calibration?.right.center} />
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

              {/* Left / Right tabs */}
              <View style={styles.tabRow}>
                <Pressable
                  onPress={() => setCompletionTab('left')}
                  style={[styles.tab, completionTab === 'left' && styles.tabActive]}>
                  <ThemedText
                    type="smallBold"
                    style={completionTab === 'left' ? styles.tabTextActive : styles.tabTextInactive}>
                    Left
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setCompletionTab('right')}
                  style={[styles.tab, completionTab === 'right' && styles.tabActive]}>
                  <ThemedText
                    type="smallBold"
                    style={completionTab === 'right' ? styles.tabTextActive : styles.tabTextInactive}>
                    Right
                  </ThemedText>
                </Pressable>
              </View>

              {isLoadingReport ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
                  Loading report…
                </ThemedText>
              ) : activeReport ? (
                <>
                  <View style={styles.reportSummary}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Wiper {activeReport.wiperNo} · {activeReport.wipes} wipes · {activeReport.strokes} strokes
                    </ThemedText>
                  </View>
                  <SessionReportTable records={activeReport.records} />
                </>
              ) : (
                <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
                  No report data.
                </ThemedText>
              )}

              <Pressable
                onPress={handleReset}
                style={({ pressed }) => [styles.resetButton, pressed && styles.disabled]}>
                <ThemedText type="smallBold" style={styles.resetButtonText}>
                  New Session
                </ThemedText>
              </Pressable>
            </ThemedView>
          )}
        </ScrollView>
      </SafeAreaView>

      <StartSessionModal
        visible={isStartModalVisible}
        onCancel={() => setIsStartModalVisible(false)}
        onConfirm={(l, r) => handleConfirmStart(l, r)}
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
  tabRow: {
    flexDirection: 'row',
    borderRadius: Spacing.two,
    overflow: 'hidden',
    backgroundColor: '#7A889820',
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: Spacing.two,
  },
  tabActive: { backgroundColor: Brand.primary },
  tabTextActive: { color: '#ffffff' },
  tabTextInactive: { color: '#7A8898' },
  reportSummary: { paddingHorizontal: Spacing.one },
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
