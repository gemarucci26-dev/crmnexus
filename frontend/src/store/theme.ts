import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme } from '../types';

interface ThemeStore {
  mode: Theme;
  toggle: () => void;
  setMode: (mode: Theme) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      mode: 'dark',
      toggle: () => {
        const newMode = get().mode === 'dark' ? 'light' : 'dark';
        set({ mode: newMode });
        document.documentElement.setAttribute('data-theme', newMode);
        if (newMode === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
      setMode: (mode) => {
        set({ mode });
        document.documentElement.setAttribute('data-theme', mode);
        if (mode === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
    }),
    {
      name: 'nexus-theme',
    }
  )
);
