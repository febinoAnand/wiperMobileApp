import { useCallback, useState } from 'react';

import type { WiperReading } from '@/types/wiper';

export type WiperSessionState = {
  pressure: number;
  currentAngle: number;
};

const INITIAL_STATE: WiperSessionState = {
  pressure: 0,
  currentAngle: 0,
};

/** Tracks the live angle (relative to the calibrated center) and pressure while a session is active. */
export function useWiperSession(center: number, isActive: boolean) {
  const [state, setState] = useState<WiperSessionState>(INITIAL_STATE);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const processReading = useCallback(
    (reading: WiperReading) => {
      if (!isActive) {
        return;
      }

      setState({
        pressure: reading.pressure,
        currentAngle: reading.angle - center,
      });
    },
    [center, isActive],
  );

  return { state, processReading, reset };
}
