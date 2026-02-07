import { useEffect, useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import toast from "react-hot-toast";

export function useServiceWorker() {
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        intervalRef.current = setInterval(
          () => registration.update(),
          60 * 60 * 1000,
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

  useEffect(() => {
    if (needRefresh) {
      toast.custom(
        (t) => (
          <div
            className="bg-surface px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 cursor-pointer"
            onClick={() => {
              toast.dismiss(t.id);
              updateServiceWorker(true);
            }}
          >
            <span className="text-plum">
              A new version is available. Tap to update.
            </span>
          </div>
        ),
        { duration: Infinity },
      );
    }
  }, [needRefresh, updateServiceWorker]);
}
