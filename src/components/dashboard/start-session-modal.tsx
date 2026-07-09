import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type StartSessionModalProps = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (leftWiperNo: string, rightWiperNo: string) => void;
};

export function StartSessionModal({ visible, onCancel, onConfirm }: StartSessionModalProps) {
  const theme = useTheme();
  const [leftWiperNo, setLeftWiperNo] = useState('');
  const [rightWiperNo, setRightWiperNo] = useState('');
  const rightRef = useRef<TextInput>(null);

  const canConfirm = leftWiperNo.trim().length > 0 && rightWiperNo.trim().length > 0;

  const handleCancel = () => {
    setLeftWiperNo('');
    setRightWiperNo('');
    onCancel();
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    const left = leftWiperNo.trim();
    const right = rightWiperNo.trim();
    setLeftWiperNo('');
    setRightWiperNo('');
    onConfirm(left, right);
  };

  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.backgroundSelected }];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <ThemedView style={styles.overlay}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Wiper numbers</ThemedText>

          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <ThemedText type="small" themeColor="textSecondary">Left wiper</ThemedText>
              <TextInput
                style={inputStyle}
                value={leftWiperNo}
                onChangeText={setLeftWiperNo}
                autoCapitalize="characters"
                placeholder="e.g. 1"
                placeholderTextColor={theme.textSecondary}
                returnKeyType="next"
                onSubmitEditing={() => rightRef.current?.focus()}
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" themeColor="textSecondary">Right wiper</ThemedText>
              <TextInput
                ref={rightRef}
                style={inputStyle}
                value={rightWiperNo}
                onChangeText={setRightWiperNo}
                autoCapitalize="characters"
                placeholder="e.g. 2"
                placeholderTextColor={theme.textSecondary}
                returnKeyType="done"
                onSubmitEditing={handleConfirm}
              />
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable onPress={handleCancel} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
              <ThemedText type="smallBold" themeColor="textSecondary">Cancel</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              disabled={!canConfirm}
              style={({ pressed }) => [styles.button, styles.okButton, (pressed || !canConfirm) && styles.disabled]}>
              <ThemedText type="smallBold" style={styles.okButtonText}>Start</ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  inputGroup: {
    flex: 1,
    gap: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.three,
  },
  button: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  pressed: { opacity: 0.7 },
  okButton: { backgroundColor: Brand.primary },
  okButtonText: { color: '#ffffff' },
  disabled: { opacity: 0.5 },
});
