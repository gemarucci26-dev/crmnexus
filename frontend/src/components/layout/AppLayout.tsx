import type { ReactNode } from 'react';
import { useUIStore } from '../../store/ui';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';

interface AppLayoutProps {
  title: string;
  children: ReactNode;
}

export function AppLayout({ title, children }: AppLayoutProps) {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div
        className="transition-all duration-200"
        style={{ marginLeft: typeof window !== 'undefined' && window.innerWidth < 768 ? 0 : sidebarCollapsed ? 72 : 256 }}
      >
        <Header title={title} />
        <main className="p-6 pb-24 md:pb-6 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
