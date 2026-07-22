import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStore {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  notifications: { id: string; title: string; message: string; read: boolean }[];
  addNotification: (n: { title: string; message: string }) => void;
  markRead: (id: string) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      notifications: [],
      addNotification: (n) =>
        set((s) => ({
          notifications: [
            { id: Date.now().toString(), title: n.title, message: n.message, read: false },
            ...s.notifications,
          ].slice(0, 50),
        })),
      markRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
    }),
    {
      name: 'nexus-ui',
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
);
