import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SIZE = 220;
const RADIUS = SIZE / 2 - 10;
const CENTER_X = SIZE / 2;
const CENTER_Y = SIZE / 2;

/** Maps a 0-180 angle onto the semicircle: 0 = full left, 90 = straight up, 180 = full right. */
function angleToPoint(angleDeg: number, length: number) {
  const clamped = Math.max(0, Math.min(180, angleDeg));
  const radians = ((clamped - 90) * Math.PI) / 180;
  return {
    x: CENTER_X + length * Math.sin(radians),
    y: CENTER_Y - length * Math.cos(radians),
  };
}

export type AngleGaugeProps = {
  angle: number;
};

export function AngleGauge({ angle }: AngleGaugeProps) {
  const theme = useTheme();
  const needle = angleToPoint(angle, RADIUS - 16);

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE / 2 + 24}>
        <Path
          d={`M ${CENTER_X - RADIUS} ${CENTER_Y} A ${RADIUS} ${RADIUS} 0 0 1 ${CENTER_X + RADIUS} ${CENTER_Y}`}
          stroke={theme.backgroundSelected}
          strokeWidth={3}
          fill="none"
        />
        <Line x1={CENTER_X} y1={CENTER_Y} x2={needle.x} y2={needle.y} stroke={Brand.primary} strokeWidth={4} />
        <Circle cx={CENTER_X} cy={CENTER_Y} r={5} fill={Brand.primary} />
      </Svg>
      <View style={styles.scale}>
        <ThemedText type="small" themeColor="textSecondary">
          0°
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          90°
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          180°
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: Spacing.two },
  scale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: SIZE,
  },
});
