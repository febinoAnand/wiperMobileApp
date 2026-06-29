import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SIZE = 220;
const RADIUS = SIZE / 2 - 10;
const CENTER_X = SIZE / 2;
const CENTER_Y = SIZE / 2;

/** 0deg = straight up, positive = right, negative = left. */
function angleToPoint(angleDeg: number, length: number) {
  const clamped = Math.max(-90, Math.min(90, angleDeg));
  const radians = (clamped * Math.PI) / 180;
  return {
    x: CENTER_X + length * Math.sin(radians),
    y: CENTER_Y - length * Math.cos(radians),
  };
}

export type AngleGaugeProps = {
  currentAngle: number;
};

export function AngleGauge({ currentAngle }: AngleGaugeProps) {
  const theme = useTheme();
  const needle = angleToPoint(currentAngle, RADIUS - 16);

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE / 2 + 24}>
        <Path
          d={`M ${CENTER_X - RADIUS} ${CENTER_Y} A ${RADIUS} ${RADIUS} 0 0 1 ${CENTER_X + RADIUS} ${CENTER_Y}`}
          stroke={theme.backgroundSelected}
          strokeWidth={3}
          fill="none"
        />
        <Line x1={CENTER_X} y1={CENTER_Y} x2={needle.x} y2={needle.y} stroke={theme.text} strokeWidth={4} />
        <Circle cx={CENTER_X} cy={CENTER_Y} r={5} fill={theme.text} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: Spacing.two },
});
