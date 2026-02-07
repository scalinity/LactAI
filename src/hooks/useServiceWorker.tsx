import { useEffect, useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

const SW_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useServiceWorker() {
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        intervalRef.current = setInterval(
          () => registration.update(),
          SW_CHECK_INTERVAL_MS,
        );
      }
    },
  });

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}
