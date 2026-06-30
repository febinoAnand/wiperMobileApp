import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export type TimerControlProps = {
  intervalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  canStart: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
};

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function TimerControl({
  intervalSeconds,
  remainingSeconds,
  isRunning,
  canStart,
  onStart,
  onStop,
  onReset,
}: TimerControlProps) {
  const disabled = !isRunning && !canStart;

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <ThemedView style={styles.timerColumn}>
        <ThemedText type="small" themeColor="textSecondary">
          Time interval
        </ThemedText>
        <ThemedText type="title" style={styles.timer}>
          {formatSeconds(isRunning ? remainingSeconds : intervalSeconds)}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.buttonRow}>
        <Pressable
          onPress={onReset}
          style={({ pressed }) => [styles.button, styles.resetButton, pressed && styles.disabled]}>
          <ThemedText type="smallBold" style={styles.resetButtonText}>
            Reset
          </ThemedText>
        </Pressable>
        <Pressable
          disabled={disabled}
          onPress={isRunning ? onStop : onStart}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: isRunning ? '#e0524d' : '#3c87f7' },
            (pressed || disabled) && styles.disabled,
          ]}>
          <ThemedText type="smallBold" style={styles.buttonText}>
            {isRunning ? 'Stop' : 'Start'}
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  timerColumn: { gap: Spacing.half },
  timer: { fontSize: 36, lineHeight: 40 },
  buttonRow: { flexDirection: 'row', gap: Spacing.two },
  button: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
  },
  resetButton: { backgroundColor: '#6b7280' },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#ffffff' },
  resetButtonText: { color: '#ffffff' },
});
