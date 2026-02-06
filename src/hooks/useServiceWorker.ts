import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import toast from "react-hot-toast";

export function useServiceWorker() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        setInterval(() => registration.update(), 60 * 60 * 1000);
      }
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toast("A new version is available. Tap to update.", {
        duration: Infinity,
      });
    }
  }, [needRefresh, updateServiceWorker]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker);
                toast('New version available!', {
                  description: 'Click here to update',
                  duration: Infinity,
                  onClick: () => {
                    updateServiceWorker();
                  },
                  action: {
                    label: 'Update',
                    onClick: () => {
                      updateServiceWorker();
                    },
                  },
                });
              }
            });
          }
        });
      });
    }
  }, []);
}
