import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isHydrated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
        localStorage.removeItem('nexus-auth');
      },
      setUser: (user) => set({ user }),
    }),
    {
      name: 'nexus-auth',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => {
        return () => {
          useAuthStore.setState({ isHydrated: true });
        };
      },
    }
  )
);

// Fallback: garantir que isHydrated fique true mesmo se o callback não disparar
setTimeout(() => {
  const state = useAuthStore.getState();
  if (!state.isHydrated) {
    useAuthStore.setState({ isHydrated: true });
  }
}, 500);