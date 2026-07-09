import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SIZE = 130;
const RADIUS = 50;
const CX = SIZE / 2; // 65
const CY = SIZE / 2; // 65
const STROKE = 10;
const NEEDLE_LEN = RADIUS - 2; // tip sits at centre of arc stroke
const SVG_H = CY + STROKE / 2 + 4; // 74

const TRACK = `M ${CX - RADIUS} ${CY} A ${RADIUS} ${RADIUS} 0 0 1 ${CX + RADIUS} ${CY}`;

function filledArc(deg: number): string {
  const d = Math.max(1, Math.min(179, deg));
  const r = ((d - 90) * Math.PI) / 180;
  return `M ${CX - RADIUS} ${CY} A ${RADIUS} ${RADIUS} 0 0 1 ${(CX + RADIUS * Math.sin(r)).toFixed(2)} ${(CY - RADIUS * Math.cos(r)).toFixed(2)}`;
}

function needlePt(deg: number) {
  const r = ((Math.max(0, Math.min(180, deg)) - 90) * Math.PI) / 180;
  return {
    x: CX + NEEDLE_LEN * Math.sin(r),
    y: CY - NEEDLE_LEN * Math.cos(r),
  };
}

export function SpeedoGauge({ angle }: { angle: number }) {
  const theme = useTheme();
  const n = needlePt(angle);

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SVG_H}>
        {/* Track */}
        <Path d={TRACK} stroke={theme.backgroundSelected} strokeWidth={STROKE} fill="none" strokeLinecap="round" />
        {/* Filled arc – brand teal up to current angle */}
        {angle > 0 && (
          <Path d={filledArc(angle)} stroke={Brand.primary} strokeWidth={STROKE} fill="none" strokeLinecap="round" />
        )}
        {/* Needle */}
        <Line x1={CX} y1={CY} x2={n.x} y2={n.y} stroke={Brand.primary} strokeWidth={2.5} strokeLinecap="round" />
        {/* Hub dot */}
        <Circle cx={CX} cy={CY} r={5} fill={Brand.primary} />
      </Svg>
      <ThemedText type="smallBold" style={styles.angle}>
        {angle.toFixed(1)}°
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 2 },
  angle: { fontSize: 16, lineHeight: 20 },
});
