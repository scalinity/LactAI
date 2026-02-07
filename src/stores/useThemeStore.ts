import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  initThemeListener: () => () => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

function applyTheme(resolved: 'light' | 'dark') {
  if (resolved === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      resolvedTheme: getSystemTheme(),
      
      setMode: (mode: ThemeMode) => {
        const resolved = mode === 'system' ? getSystemTheme() : mode;
        set({ mode, resolvedTheme: resolved });
        applyTheme(resolved);
      },
      
      initThemeListener: () => {
        const handler = () => {
          const { mode } = get();
          if (mode === 'system') {
            const resolved = getSystemTheme();
            set({ resolvedTheme: resolved });
            applyTheme(resolved);
          }
        };
        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        mql.addEventListener('change', handler);

        // Apply on init - recalculate for system mode
        const { mode } = get();
        const resolved = mode === 'system' ? getSystemTheme() : mode;
        set({ resolvedTheme: resolved });
        applyTheme(resolved);

        return () => mql.removeEventListener('change', handler);
      },
    }),
    {
      name: 'claudia-theme-storage',
    }
  )
);
