import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
import type { CalibrationData, DualWiperReading, SessionReport, WipeRecord, WiperReading } from '@/types/wiper';

type WiperTab = 'left' | 'right';

function fmtSeconds(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { status, connectedDevice, latestDualReading, latestReading, write, connect, disconnect } = useBluetooth();

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
  const [completionTab, setCompletionTab] = useState<WiperTab>('left');
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);

  // ── Per-wiper live data ────────────────────────────────────────────────────
  const [wLAngle, setWLAngle] = useState(0);
  const [wLWipes, setWLWipes] = useState(0);
  const [wLStrokes, setWLStrokes] = useState(0);
  const [wRAngle, setWRAngle] = useState(0);
  const [wRWipes, setWRWipes] = useState(0);
  const [wRStrokes, setWRStrokes] = useState(0);
  const [pressure, setPressure] = useState(0);

  // Accumulated per-wiper records during the active session
  const leftRecordsRef = useRef<WipeRecord[]>([]);
  const rightRecordsRef = useRef<WipeRecord[]>([]);

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

  // Render-time latch: single wipe event → seq counters + record accumulation (session only)
  const [lastReading, setLastReading] = useState<WiperReading | null>(latestReading);
  if (latestReading !== lastReading) {
    setLastReading(latestReading);
    if (latestReading && typeof latestReading.seq === 'number') {
      const isRight = latestReading.wiper === 'right' || String(latestReading.wiper_no) === '2';
      const record: WipeRecord = {
        seq: latestReading.seq,
        dir: latestReading.dir ?? '',
        angle: latestReading.angle,
        pressure: latestReading.pressure,
      };
      if (isRight) {
        setWRWipes(latestReading.seq);
        setWRStrokes(Math.floor(latestReading.seq / 2));
        rightRecordsRef.current.push(record);
      } else {
        setWLWipes(latestReading.seq);
        setWLStrokes(Math.floor(latestReading.seq / 2));
        leftRecordsRef.current.push(record);
      }
    }
  }

  // ── Countdown + session callbacks ──────────────────────────────────────────
  const handleSessionComplete = useCallback(() => {
    const now = Math.floor(Date.now() / 1000);
    const lReport: SessionReport = {
      wiperNo: currentLeftWiperNo ?? 'L',
      timestamp: now,
      duration: intervalSeconds,
      wipes: wLWipes,
      strokes: wLStrokes,
      records: [...leftRecordsRef.current],
    };
    const rReport: SessionReport = {
      wiperNo: currentRightWiperNo ?? 'R',
      timestamp: now,
      duration: intervalSeconds,
      wipes: wRWipes,
      strokes: wRStrokes,
      records: [...rightRecordsRef.current],
    };
    setLeftReport(lReport);
    setRightReport(rReport);
    setCompletionTab('left');
    setShowCompletion(true);
    addDualSessionReport({ timestamp: now, left: lReport, right: rReport }).catch(() => {});
  }, [currentLeftWiperNo, currentRightWiperNo, intervalSeconds, wLWipes, wLStrokes, wRWipes, wRStrokes]);

  const countdown = useCountdown(handleSessionComplete);
  const canStart = status === 'connected' && calibration !== null;
  const startStopDisabled = !countdown.isRunning && !canStart;

  const handleReset = useCallback(() => {
    setShowCompletion(false);
    setIsReportModalVisible(false);
    setLeftReport(null);
    setRightReport(null);
    setWLWipes(0);
    setWLStrokes(0);
    setWRWipes(0);
    setWRStrokes(0);
    leftRecordsRef.current = [];
    rightRecordsRef.current = [];
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
      leftRecordsRef.current = [];
      rightRecordsRef.current = [];
      countdown.start(intervalSeconds);
    },
    [intervalSeconds, write, countdown],
  );

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

  const modalReport = completionTab === 'left' ? leftReport : rightReport;

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

          {/* Session complete card */}
          {showCompletion && (
            <ThemedView type="backgroundElement" style={styles.completionCard}>
              <ThemedText type="subtitle" style={styles.centered}>Session complete</ThemedText>

              {/* Per-wiper wipe + stroke counts */}
              <View style={styles.statGrid}>
                <View style={styles.statItem}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Left {leftReport?.wiperNo}
                  </ThemedText>
                  <ThemedText type="title" style={styles.statValue}>
                    {leftReport?.wipes ?? 0}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">Wipes</ThemedText>
                  <ThemedText type="smallBold" style={styles.strokeValue}>
                    {leftReport?.strokes ?? 0}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">Strokes</ThemedText>
                </View>
                <View style={styles.statSeparator} />
                <View style={styles.statItem}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Right {rightReport?.wiperNo}
                  </ThemedText>
                  <ThemedText type="title" style={styles.statValue}>
                    {rightReport?.wipes ?? 0}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">Wipes</ThemedText>
                  <ThemedText type="smallBold" style={styles.strokeValue}>
                    {rightReport?.strokes ?? 0}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">Strokes</ThemedText>
                </View>
              </View>

              <View style={styles.completionBtnRow}>
                <Pressable
                  onPress={() => { setCompletionTab('left'); setIsReportModalVisible(true); }}
                  style={({ pressed }) => [styles.actionBtn, { backgroundColor: Brand.primary }, pressed && styles.disabled]}>
                  <ThemedText type="smallBold" style={styles.actionBtnText}>Show Report</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleReset}
                  style={({ pressed }) => [styles.actionBtn, styles.resetBtn, pressed && styles.disabled]}>
                  <ThemedText type="smallBold" style={styles.resetBtnText}>Reset</ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          )}
        </ScrollView>
      </SafeAreaView>

      <StartSessionModal
        visible={isStartModalVisible}
        onCancel={() => setIsStartModalVisible(false)}
        onConfirm={(l, r) => handleConfirmStart(l, r)}
      />

      {/* Session report modal */}
      <Modal
        visible={isReportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsReportModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={styles.reportModal}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <ThemedText type="smallBold">Session Report</ThemedText>
              <Pressable onPress={() => setIsReportModalVisible(false)}>
                <ThemedText type="title" themeColor="textSecondary" style={styles.modalClose}>×</ThemedText>
              </Pressable>
            </View>

            {/* Left / Right tabs */}
            <View style={styles.tabRow}>
              <Pressable
                onPress={() => setCompletionTab('left')}
                style={[styles.tab, completionTab === 'left' && styles.tabActive]}>
                <ThemedText type="smallBold" style={completionTab === 'left' ? styles.tabTextActive : styles.tabTextInactive}>
                  Left
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setCompletionTab('right')}
                style={[styles.tab, completionTab === 'right' && styles.tabActive]}>
                <ThemedText type="smallBold" style={completionTab === 'right' ? styles.tabTextActive : styles.tabTextInactive}>
                  Right
                </ThemedText>
              </Pressable>
            </View>

            {/* Stats + table */}
            {modalReport && (
              <>
                <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
                  Wiper {modalReport.wiperNo}
                </ThemedText>
                <View style={styles.statGrid}>
                  <View style={styles.statItem}>
                    <ThemedText type="title" style={styles.statValue}>{modalReport.wipes}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">Wipes</ThemedText>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <ThemedText type="title" style={styles.statValue}>{modalReport.strokes}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">Strokes</ThemedText>
                  </View>
                </View>
                <SessionReportTable records={modalReport.records} />
              </>
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
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
    alignItems: 'center',
  },
  actionBtnText: { color: '#ffffff' },
  completionCard: { borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.three },
  centered: { textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  reportModal: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalClose: { fontSize: 28, lineHeight: 32, paddingHorizontal: Spacing.two },
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
  statGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: Spacing.two,
  },
  statItem: { alignItems: 'center', gap: Spacing.half },
  statValue: { fontSize: 40, lineHeight: 44 },
  strokeValue: { fontSize: 24, lineHeight: 28, marginTop: Spacing.two },
  statDivider: { width: 1, height: 48, backgroundColor: '#7A889830' },
  statSeparator: { width: 1, backgroundColor: '#7A889830', alignSelf: 'stretch' },
  completionBtnRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  resetBtn: { backgroundColor: '#7A889820' },
  resetBtnText: { color: '#7A8898' },
  disabled: { opacity: 0.5 },
});
