import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export type CalibrationStepProps = {
  title: string;
  liveAngle: number;
  capturedAngle: number | null;
  onCapture: () => void;
};

export function CalibrationStep({ title, liveAngle, capturedAngle, onCapture }: CalibrationStepProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {capturedAngle !== null ? `Captured: ${capturedAngle.toFixed(1)}°` : `Live: ${liveAngle.toFixed(1)}°`}
        </ThemedText>
      </ThemedView>
      <Pressable onPress={onCapture} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <ThemedText type="smallBold" style={styles.buttonText}>
          {capturedAngle !== null ? 'Recapture' : 'Capture'}
        </ThemedText>
      </Pressable>
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
  header: { gap: Spacing.half },
  button: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    backgroundColor: '#3c87f7',
  },
  pressed: { opacity: 0.7 },
  buttonText: { color: '#ffffff' },
});
