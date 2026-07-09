import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SessionReportTable } from '@/components/dashboard/session-report-table';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { clearSessionReports, getSessionReports } from '@/services/storage';
import type { SessionReportEntry } from '@/types/wiper';

function formatEntryDate(timestampSeconds: number) {
  return new Date(timestampSeconds * 1000).toLocaleString();
}

export default function ReportsScreen() {
  const [reports, setReports] = useState<SessionReportEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getSessionReports().then(setReports);
    }, []),
  );

  const handleClear = useCallback(() => {
    Alert.alert('Clear reports', 'Remove all saved results?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearSessionReports();
          setExpandedId(null);
          setReports([]);
        },
      },
    ]);
  }, []);

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
              return (
                <ThemedView key={entry.id} style={styles.entry}>
                  <Pressable
                    onPress={() => setExpandedId(isExpanded ? null : entry.id)}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <ThemedView type="backgroundElement" style={styles.entryRow}>
                      <View style={styles.entryInfo}>
                        <ThemedText type="smallBold">Wiper {entry.wiperNo}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {formatEntryDate(entry.timestamp)}
                        </ThemedText>
                      </View>
                      <ThemedText type="small" themeColor="textSecondary">
                        {entry.wipes} wipes · {entry.strokes} strokes
                      </ThemedText>
                    </ThemedView>
                  </Pressable>

                  {isExpanded && <SessionReportTable records={entry.records} />}
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
  entryInfo: { gap: Spacing.half },
});
