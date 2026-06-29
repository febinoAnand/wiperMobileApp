import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { ConnectionStatus } from '@/types/wiper';

export type ConnectionBadgeProps = {
  status: ConnectionStatus;
  deviceName?: string;
  onPress: () => void;
};

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connected: 'Connected',
  connecting: 'Connecting…',
  disconnected: 'Not connected',
};

const STATUS_COLOR: Record<ConnectionStatus, string> = {
  connected: '#3ecf6f',
  connecting: '#e0a13c',
  disconnected: '#9aa0aa',
};

export function ConnectionBadge({ status, deviceName, onPress }: ConnectionBadgeProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.badge}>
        <ThemedView style={[styles.dot, { backgroundColor: STATUS_COLOR[status] }]} />
        <ThemedText type="small">{status === 'connected' && deviceName ? deviceName : STATUS_LABEL[status]}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
