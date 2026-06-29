import { FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useBluetooth } from '@/contexts/bluetooth-context';
import type { WiperReading } from '@/types/wiper';

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.toLocaleTimeString()}.${String(date.getMilliseconds()).padStart(3, '0')}`;
}

function LogRow({ reading }: { reading: WiperReading }) {
  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.time}>
        {formatTime(reading.timestamp)}
      </ThemedText>
      <ThemedText type="small" style={styles.cell}>
        {reading.angle.toFixed(2)}°
      </ThemedText>
      <ThemedText type="small" style={styles.cell}>
        {reading.pressure.toFixed(2)} bar
      </ThemedText>
      <ThemedText type="small" style={styles.cell}>
        #{reading.count}
      </ThemedText>
    </ThemedView>
  );
}

export default function LogScreen() {
  const { readingLog, clearLog, status } = useBluetooth();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.content}>
          <ThemedText type="subtitle">Log</ThemedText>

          <ThemedView style={styles.header}>
            <ThemedText type="small" themeColor="textSecondary">
              {status === 'connected' ? `${readingLog.length} entries` : 'Not connected'}
            </ThemedText>
            <Pressable onPress={clearLog} disabled={readingLog.length === 0}>
              <ThemedText type="link" themeColor="textSecondary">
                Clear
              </ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView type="backgroundElement" style={[styles.row, styles.headerRow]}>
            <ThemedText type="smallBold" style={styles.time}>
              Time
            </ThemedText>
            <ThemedText type="smallBold" style={styles.cell}>
              Deg
            </ThemedText>
            <ThemedText type="smallBold" style={styles.cell}>
              Pressure
            </ThemedText>
            <ThemedText type="smallBold" style={styles.cell}>
              Count
            </ThemedText>
          </ThemedView>

          <FlatList
            data={readingLog}
            keyExtractor={(item, index) => `${item.timestamp}-${index}`}
            renderItem={({ item }) => <LogRow reading={item} />}
            ItemSeparatorComponent={() => <ThemedView style={styles.separator} />}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                No data received yet.
              </ThemedText>
            }
          />
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerRow: { borderRadius: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  time: { flexBasis: '34%' },
  cell: { flexBasis: '22%' },
  separator: { height: Spacing.half },
  listContent: { gap: Spacing.half, paddingBottom: BottomTabInset + Spacing.three },
  empty: { textAlign: 'center', paddingTop: Spacing.five },
});
