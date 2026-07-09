import { StyleSheet, View } from 'react-native';

import { SpeedoGauge } from '@/components/dashboard/speedo-gauge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';

export type WiperCardProps = {
  label: string;
  angle: number;
  wipesCount: number;
  strokeCount: number;
};

export function WiperCard({ label, angle, wipesCount, strokeCount }: WiperCardProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold" style={styles.label}>
        {label}
      </ThemedText>

      <SpeedoGauge angle={angle} />

      <View style={styles.stats}>
        <StatRow name="Wipes" value={String(wipesCount)} accent />
        <StatRow name="Strokes" value={String(strokeCount)} accent />
      </View>
    </ThemedView>
  );
}

function StatRow({ name, value, accent }: { name: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {name}
      </ThemedText>
      <ThemedText type="smallBold" style={accent ? styles.accent : undefined}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Spacing.three,
    padding: Spacing.two,
    alignItems: 'center',
    gap: Spacing.two,
  },
  label: { alignSelf: 'flex-start', paddingHorizontal: Spacing.one },
  stats: { width: '100%', gap: Spacing.one },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.one,
  },
  accent: { color: Brand.primary },
});
