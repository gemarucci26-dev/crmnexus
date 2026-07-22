import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface UIStore {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  notifications: { id: string; title: string; message: string; read: boolean }[];
  addNotification: (n: { title: string; message: string }) => void;
  markRead: (id: string) => void;
}

const defaultState: UIStore = {
  sidebarCollapsed: false,
  toggleSidebar: () => {},
  notifications: [],
  addNotification: () => {},
  markRead: () => {},
};

const UIContext = createContext<UIStore | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('nexus-ui');
      if (stored) return JSON.parse(stored).sidebarCollapsed ?? false;
    } catch {}
    return false;
  });
  const [notifications, setNotifications] = useState(defaultState.notifications);

  useEffect(() => {
    localStorage.setItem('nexus-ui', JSON.stringify({ sidebarCollapsed }));
  }, [sidebarCollapsed]);

  const toggleSidebar = () => setSidebarCollapsed((v) => !v);

  const addNotification = (n: { title: string; message: string }) => {
    setNotifications((prev) => [{ id: Date.now().toString(), title: n.title, message: n.message, read: false }, ...prev].slice(0, 50));
  };

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
  };

  return (
    <UIContext.Provider value={{ sidebarCollapsed, toggleSidebar, notifications, addNotification, markRead }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI deve ser usado dentro de UIProvider');
  return ctx;
}
