import { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import toast from 'react-hot-toast';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function useBackupReminder() {
  const { lastBackupPrompt, setLastBackupPrompt } = useAppStore();

  useEffect(() => {
    const now = Date.now();
    
    // If never prompted, or 30+ days since last prompt
    if (!lastBackupPrompt || now - lastBackupPrompt >= THIRTY_DAYS_MS) {
      // Show reminder after a short delay to avoid interfering with app load
      const timer = setTimeout(() => {
        toast("It's been 30 days since your last backup. Consider exporting your data from Settings.", {
          duration: 8000,
          icon: 'ℹ️',
        });
        
        // Update timestamp when shown
        setLastBackupPrompt(now);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [lastBackupPrompt, setLastBackupPrompt]);
}