import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SessionReportTable } from '@/components/dashboard/session-report-table';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { clearDualSessionReports, getDualSessionReports } from '@/services/storage';
import type { DualSessionReportEntry } from '@/types/wiper';

type WiperTab = 'left' | 'right';

function formatDate(timestampSeconds: number) {
  return new Date(timestampSeconds * 1000).toLocaleString();
}

export default function ReportsScreen() {
  const [reports, setReports] = useState<DualSessionReportEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tabByEntry, setTabByEntry] = useState<Record<string, WiperTab>>({});

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
          setExpandedId(null);
          setReports([]);
        },
      },
    ]);
  }, []);

  const getTab = (id: string): WiperTab => tabByEntry[id] ?? 'left';

  const setTab = (id: string, tab: WiperTab) =>
    setTabByEntry((prev) => ({ ...prev, [id]: tab }));

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
            reports.map((entry) => {
              const isExpanded = expandedId === entry.id;
              const activeTab = getTab(entry.id);
              const activeReport = activeTab === 'left' ? entry.left : entry.right;

              return (
                <ThemedView key={entry.id} style={styles.entry}>
                  {/* Collapsed row */}
                  <Pressable
                    onPress={() => setExpandedId(isExpanded ? null : entry.id)}
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

                  {/* Expanded detail */}
                  {isExpanded && (
                    <ThemedView type="backgroundElement" style={styles.expandedCard}>
                      {/* Tab bar */}
                      <View style={styles.tabRow}>
                        <Pressable
                          onPress={() => setTab(entry.id, 'left')}
                          style={[styles.tab, activeTab === 'left' && styles.tabActive]}>
                          <ThemedText
                            type="smallBold"
                            style={activeTab === 'left' ? styles.tabTextActive : styles.tabTextInactive}>
                            Left
                          </ThemedText>
                        </Pressable>
                        <Pressable
                          onPress={() => setTab(entry.id, 'right')}
                          style={[styles.tab, activeTab === 'right' && styles.tabActive]}>
                          <ThemedText
                            type="smallBold"
                            style={activeTab === 'right' ? styles.tabTextActive : styles.tabTextInactive}>
                            Right
                          </ThemedText>
                        </Pressable>
                      </View>

                      {/* Summary row */}
                      <ThemedText type="small" themeColor="textSecondary" style={styles.summary}>
                        Wiper {activeReport.wiperNo} · {activeReport.wipes} wipes · {activeReport.strokes} strokes
                      </ThemedText>

                      {/* Records table */}
                      <SessionReportTable records={activeReport.records} />
                    </ThemedView>
                  )}
                </ThemedView>
              );
            })
          )}
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
  pressed: { opacity: 0.7 },
  entry: { gap: Spacing.two },
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
  expandedCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
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
});
