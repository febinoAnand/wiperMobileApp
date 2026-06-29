import { useCallback, useEffect, useRef, useState } from 'react';

export function useCountdown(onComplete: () => void) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clear();
    setIsRunning(false);
  }, [clear]);

  const start = useCallback(
    (seconds: number) => {
      clear();
      setRemainingSeconds(seconds);
      setIsRunning(true);
      intervalRef.current = setInterval(() => {
        setRemainingSeconds((previous) => {
          if (previous <= 1) {
            clear();
            setIsRunning(false);
            onCompleteRef.current();
            return 0;
          }
          return previous - 1;
        });
      }, 1000);
    },
    [clear],
  );

  useEffect(() => clear, [clear]);

  return { remainingSeconds, isRunning, start, stop };
}
