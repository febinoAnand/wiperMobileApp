import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type StartSessionModalProps = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (wiperNo: string) => void;
};

export function StartSessionModal({ visible, onCancel, onConfirm }: StartSessionModalProps) {
  const theme = useTheme();
  const [wiperNo, setWiperNo] = useState('');

  const handleCancel = () => {
    setWiperNo('');
    onCancel();
  };

  const handleConfirm = () => {
    const trimmed = wiperNo.trim();
    if (!trimmed) {
      return;
    }
    setWiperNo('');
    onConfirm(trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <ThemedView style={styles.overlay}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Wiper number</ThemedText>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
            value={wiperNo}
            onChangeText={setWiperNo}
            autoCapitalize="characters"
            placeholder="e.g. 1 or A1"
            placeholderTextColor={theme.textSecondary}
            autoFocus
          />
          <ThemedView style={styles.actions}>
            <Pressable onPress={handleCancel} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              disabled={!wiperNo}
              style={({ pressed }) => [styles.button, styles.okButton, (pressed || !wiperNo) && styles.disabled]}>
              <ThemedText type="smallBold" style={styles.okButtonText}>
                OK
              </ThemedText>
            </Pressable>
          </ThemedView>
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
    maxWidth: 320,
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
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
  okButton: { backgroundColor: '#3c87f7' },
  okButtonText: { color: '#ffffff' },
  disabled: { opacity: 0.5 },
});
