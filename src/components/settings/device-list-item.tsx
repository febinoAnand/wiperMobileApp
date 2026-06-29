import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { BluetoothDeviceInfo } from '@/types/wiper';

export type DeviceListItemProps = {
  device: BluetoothDeviceInfo;
  isConnected: boolean;
  isBusy: boolean;
  onPress: () => void;
};

export function DeviceListItem({ device, isConnected, isBusy, onPress }: DeviceListItemProps) {
  return (
    <Pressable onPress={onPress} disabled={isBusy} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <ThemedView style={styles.info}>
          <ThemedText type="smallBold">{device.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {device.id}
          </ThemedText>
        </ThemedView>
        <ThemedText type="small" themeColor={isConnected ? 'text' : 'textSecondary'}>
          {isConnected ? 'Connected' : isBusy ? 'Connecting…' : 'Connect'}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  info: { gap: Spacing.half },
});
