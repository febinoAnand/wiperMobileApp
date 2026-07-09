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
const NEEDLE_LEN = RADIUS - 2;
const SVG_H = CY + STROKE / 2 + 4; // 74

const TRACK = `M ${CX - RADIUS} ${CY} A ${RADIUS} ${RADIUS} 0 0 1 ${CX + RADIUS} ${CY}`;

/** Point on the arc at a gauge-degree (0=left, 90=top, 180=right). */
function ptOnArc(deg: number) {
  const clamped = Math.max(0, Math.min(180, deg));
  const r = ((clamped - 90) * Math.PI) / 180;
  return {
    x: (CX + RADIUS * Math.sin(r)).toFixed(2),
    y: (CY - RADIUS * Math.cos(r)).toFixed(2),
  };
}

/** Arc path from min to max of two gauge-degree values. */
function arcBetween(a: number, b: number): string {
  const lo = Math.max(1, Math.min(179, Math.min(a, b)));
  const hi = Math.max(1, Math.min(179, Math.max(a, b)));
  if (Math.abs(hi - lo) < 0.5) return '';
  const s = ptOnArc(lo);
  const e = ptOnArc(hi);
  return `M ${s.x} ${s.y} A ${RADIUS} ${RADIUS} 0 0 1 ${e.x} ${e.y}`;
}

/** Arc from left (0°) up to gauge-degree — used when no calibration. */
function filledArcFrom0(deg: number): string {
  return arcBetween(0, deg);
}

function needlePt(deg: number) {
  const clamped = Math.max(0, Math.min(180, deg));
  const r = ((clamped - 90) * Math.PI) / 180;
  return {
    x: CX + NEEDLE_LEN * Math.sin(r),
    y: CY - NEEDLE_LEN * Math.cos(r),
  };
}

export type SpeedoGaugeProps = {
  angle: number;
  /** Calibrated center angle. When provided, 90° on the gauge = this value. */
  centerAngle?: number;
};

export function SpeedoGauge({ angle, centerAngle }: SpeedoGaugeProps) {
  const theme = useTheme();

  const hasCenter = centerAngle !== undefined;

  // With calibration: display relative to center (90° = center)
  // Without calibration: display raw angle directly
  const displayAngle = hasCenter
    ? Math.max(0, Math.min(180, 90 + (angle - centerAngle!)))
    : angle;

  const delta = hasCenter ? angle - centerAngle! : null;
  const n = needlePt(displayAngle);

  // Center tick: short line at 90° (straight up from hub)
  const tickOuter = CY - RADIUS - STROKE / 2 - 3;
  const tickInner = CY - RADIUS + STROKE / 2 + 2;

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SVG_H}>
        {/* Track */}
        <Path d={TRACK} stroke={theme.backgroundSelected} strokeWidth={STROKE} fill="none" strokeLinecap="round" />

        {hasCenter ? (
          /* Deviation arc: filled from 90° outward toward needle */
          displayAngle !== 90 ? (
            <Path
              d={arcBetween(90, displayAngle)}
              stroke={Brand.primary}
              strokeWidth={STROKE}
              fill="none"
              strokeLinecap="round"
            />
          ) : null
        ) : (
          /* Legacy: filled from left to angle */
          displayAngle > 0 ? (
            <Path
              d={filledArcFrom0(displayAngle)}
              stroke={Brand.primary}
              strokeWidth={STROKE}
              fill="none"
              strokeLinecap="round"
            />
          ) : null
        )}

        {/* Center tick at 90° (visible only when calibrated) */}
        {hasCenter && (
          <Line
            x1={CX} y1={tickOuter}
            x2={CX} y2={tickInner}
            stroke={theme.backgroundSelected}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )}

        {/* Needle */}
        <Line x1={CX} y1={CY} x2={n.x} y2={n.y} stroke={Brand.primary} strokeWidth={2.5} strokeLinecap="round" />
        {/* Hub dot */}
        <Circle cx={CX} cy={CY} r={5} fill={Brand.primary} />
      </Svg>

      {/* Angle label */}
      <ThemedText type="smallBold" style={styles.angle}>
        {angle.toFixed(1)}°
      </ThemedText>

      {/* Delta label */}
      {delta !== null && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.delta}>
          {delta >= 0 ? `+${delta.toFixed(1)}°` : `${delta.toFixed(1)}°`}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 2 },
  angle: { fontSize: 16, lineHeight: 20 },
  delta: { fontSize: 12, lineHeight: 16 },
});
