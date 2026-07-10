import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SessionReportTable } from '@/components/dashboard/session-report-table';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { shareCsv, sharePdf } from '@/services/report-export';
import { clearDualSessionReports, getDualSessionReports } from '@/services/storage';
import type { DualSessionReportEntry } from '@/types/wiper';

type WiperTab = 'left' | 'right';

function formatDate(timestampSeconds: number) {
  return new Date(timestampSeconds * 1000).toLocaleString();
}

export default function ReportsScreen() {
  const [reports, setReports] = useState<DualSessionReportEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<DualSessionReportEntry | null>(null);
  const [selectedTab, setSelectedTab] = useState<WiperTab>('left');

  useFocusEffect(
    useCallback(() => {
      getDualSessionReports().then(setReports);
    }, []),
  );

  const handleClear = useCallback(() => {
    Alert.alert('Clear reports', 'Remove all saved results?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearDualSessionReports();
          setReports([]);
        },
      },
    ]);
  }, []);

  const openReport = useCallback((entry: DualSessionReportEntry) => {
    setSelectedTab('left');
    setSelectedEntry(entry);
  }, []);

  const closeReport = useCallback(() => setSelectedEntry(null), []);

  const handleShareCsv = useCallback(async () => {
    if (!selectedEntry) return;
    try {
      await shareCsv(selectedEntry);
    } catch {
      Alert.alert('Share failed', 'Could not export the report as CSV.');
    }
  }, [selectedEntry]);

  const handleSharePdf = useCallback(async () => {
    if (!selectedEntry) return;
    try {
      await sharePdf(selectedEntry);
    } catch {
      Alert.alert('Share failed', 'Could not export the report as PDF.');
    }
  }, [selectedEntry]);

  const activeReport = selectedEntry
    ? selectedTab === 'left'
      ? selectedEntry.left
      : selectedEntry.right
    : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedView style={styles.header}>
            <ThemedText type="subtitle">Reports</ThemedText>
            <Pressable onPress={handleClear} disabled={reports.length === 0}>
              <ThemedText type="link" themeColor="textSecondary">
                Clear
              </ThemedText>
            </Pressable>
          </ThemedView>

          {reports.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No saved results yet. Results are saved automatically when a session completes.
            </ThemedText>
          ) : (
            reports.map((entry) => (
              <Pressable
                key={entry.id}
                onPress={() => openReport(entry)}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundElement" style={styles.entryRow}>
                  <View style={styles.entryInfo}>
                    <ThemedText type="smallBold">
                      Left {entry.left.wiperNo} · Right {entry.right.wiperNo}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatDate(entry.timestamp)}
                    </ThemedText>
                  </View>
                  <View style={styles.entryStats}>
                    <ThemedText type="small" themeColor="textSecondary">
                      L: {entry.left.wipes} wipes
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      R: {entry.right.wipes} wipes
                    </ThemedText>
                  </View>
                </ThemedView>
              </Pressable>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Report detail modal */}
      <Modal
        visible={selectedEntry !== null}
        transparent
        animationType="slide"
        onRequestClose={closeReport}>
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={styles.reportModal}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <ThemedText type="smallBold">Session Report</ThemedText>
              <Pressable onPress={closeReport}>
                <ThemedText type="title" themeColor="textSecondary" style={styles.modalClose}>
                  ×
                </ThemedText>
              </Pressable>
            </View>

            {selectedEntry && (
              <>
                <ThemedText type="small" themeColor="textSecondary" style={styles.dateText}>
                  {formatDate(selectedEntry.timestamp)}
                </ThemedText>

                {/* Left / Right tabs */}
                <View style={styles.tabRow}>
                  <Pressable
                    onPress={() => setSelectedTab('left')}
                    style={[styles.tab, selectedTab === 'left' && styles.tabActive]}>
                    <ThemedText
                      type="smallBold"
                      style={selectedTab === 'left' ? styles.tabTextActive : styles.tabTextInactive}>
                      Left
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => setSelectedTab('right')}
                    style={[styles.tab, selectedTab === 'right' && styles.tabActive]}>
                    <ThemedText
                      type="smallBold"
                      style={selectedTab === 'right' ? styles.tabTextActive : styles.tabTextInactive}>
                      Right
                    </ThemedText>
                  </Pressable>
                </View>

                {/* Stats */}
                {activeReport && (
                  <>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.summary}>
                      Wiper {activeReport.wiperNo} · {activeReport.wipes} wipes · {activeReport.strokes} strokes
                    </ThemedText>

                    {/* Records table */}
                    <SessionReportTable records={activeReport.records} />
                  </>
                )}

                {/* Share buttons */}
                <View style={styles.shareBtnRow}>
                  <Pressable
                    onPress={handleShareCsv}
                    style={({ pressed }) => [styles.shareBtn, styles.shareBtnOutline, pressed && styles.pressed]}>
                    <ThemedText type="smallBold" style={styles.shareBtnOutlineText}>
                      Share CSV
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={handleSharePdf}
                    style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}>
                    <ThemedText type="smallBold" style={styles.shareBtnText}>
                      Share PDF
                    </ThemedText>
                  </Pressable>
                </View>
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
  content: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pressed: { opacity: 0.7 },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  entryInfo: { gap: Spacing.half, flex: 1 },
  entryStats: { alignItems: 'flex-end', gap: Spacing.half },
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
  dateText: { marginTop: -Spacing.two },
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
  summary: { paddingHorizontal: Spacing.one },
  shareBtnRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  shareBtn: {
    flex: 1,
    backgroundColor: Brand.primary,
    borderRadius: Spacing.five,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  shareBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Brand.primary,
  },
  shareBtnText: { color: '#ffffff' },
  shareBtnOutlineText: { color: Brand.primary },
});
