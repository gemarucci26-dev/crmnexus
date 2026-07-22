import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Theme } from '../types';

interface ThemeContextValue {
  mode: Theme;
  toggle: () => void;
  setMode: (mode: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem('nexus-theme');
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {}
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('nexus-theme', mode);
  }, [mode]);

  const toggle = () => {
    setMode((m) => (m === 'dark' ? 'light' : 'dark'));
  };

  const setModeValue = (newMode: Theme) => {
    setMode(newMode);
  };

  return (
    <ThemeContext.Provider value={{ mode, toggle, setMode: setModeValue }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  return ctx;
}
