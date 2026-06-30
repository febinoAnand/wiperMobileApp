import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { WipeRecord } from '@/types/wiper';

const MAX_TABLE_HEIGHT = 220;

export type SessionReportTableProps = {
  records: WipeRecord[];
};

export function SessionReportTable({ records }: SessionReportTableProps) {
  return (
    <ThemedView style={styles.container}>
      <ThemedView type="backgroundElement" style={[styles.row, styles.headerRow]}>
        <ThemedText type="smallBold" style={styles.seqCell}>
          Seq
        </ThemedText>
        <ThemedText type="smallBold" style={styles.dirCell}>
          Dir
        </ThemedText>
        <ThemedText type="smallBold" style={styles.cell}>
          Angle
        </ThemedText>
        <ThemedText type="smallBold" style={styles.cell}>
          Pressure
        </ThemedText>
      </ThemedView>

      {records.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          No wipe records in this report.
        </ThemedText>
      ) : (
        <ScrollView style={styles.scroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {records.map((record, index) => (
            <ThemedView key={record.seq} style={[styles.row, index % 2 === 1 && styles.rowAlt]}>
              <ThemedText type="small" style={styles.seqCell}>
                {record.seq}
              </ThemedText>
              <ThemedText type="small" style={styles.dirCell}>
                {record.dir}
              </ThemedText>
              <ThemedText type="small" style={styles.cell}>
                {record.angle.toFixed(1)}°
              </ThemedText>
              <ThemedText type="small" style={styles.cell}>
                {record.pressure.toFixed(2)} bar
              </ThemedText>
            </ThemedView>
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.half },
  scroll: { maxHeight: MAX_TABLE_HEIGHT },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  headerRow: { borderRadius: Spacing.two },
  rowAlt: { opacity: 0.85 },
  seqCell: { flexBasis: '20%' },
  dirCell: { flexBasis: '20%' },
  cell: { flexBasis: '30%' },
  empty: { textAlign: 'center', paddingVertical: Spacing.three },
});
