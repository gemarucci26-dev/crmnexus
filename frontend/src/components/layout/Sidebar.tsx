import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Megaphone,
  Users,
  Send,
  MessageSquare,
  BarChart3,
  Wallet,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { cn } from '../../utils/cn';

const menuItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/campanhas', icon: Megaphone, label: 'Campanhas' },
  { to: '/leads', icon: Users, label: 'Leads' },
  { to: '/disparos', icon: Send, label: 'Disparos' },
  { to: '/respostas', icon: MessageSquare, label: 'Respostas' },
  { to: '/relatorios', icon: BarChart3, label: 'Relatórios' },
  { to: '/creditos', icon: Wallet, label: 'Créditos' },
  { to: '/configuracoes', icon: Settings, label: 'Configurações' },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUI();
  const logout = useAuth((s) => s.logout);

  return (
    <aside
      className="hidden md:flex flex-col h-screen fixed left-0 top-0 z-40 border-r border-[var(--border)] bg-[var(--sidebar)] transition-all duration-200"
      style={{ width: sidebarCollapsed ? 72 : 256 }}
    >
      <div className="flex items-center gap-3 p-5 h-16 border-b border-[var(--border)]">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg overflow-hidden shrink-0">
          <img src="/logo.png" alt="NEXUS" className="w-7 h-7 object-contain" />
        </div>
        {!sidebarCollapsed && (
          <span className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
            NEXUS
          </span>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-[#2563EB]/15 text-[#60A5FA]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)]'
              )
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!sidebarCollapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-[var(--border)] space-y-1">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!sidebarCollapsed && <span>Sair</span>}
        </button>
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center rounded-xl p-2 text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
        >
          {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
    </aside>
  );
}
