import { useState } from 'react';
import { Search, Bell, Sun, Moon, User, LogOut, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useUI } from '../../contexts/UIContext';
import { cn } from '../../utils/cn';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { mode, toggle } = useTheme();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const notifications = useUI((s) => s.notifications);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--sidebar)]/80 backdrop-blur-lg px-6">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
          <Search className="w-4 h-4 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Buscar..."
            className="bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]/50 w-48"
          />
        </div>

        <button
          onClick={toggle}
          className="rounded-xl border border-[var(--border)] p-2.5 text-[var(--text-secondary)] hover:bg-[var(--hover)] transition-colors cursor-pointer"
        >
          {mode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowDropdown(false); }}
            className="relative rounded-xl border border-[var(--border)] p-2.5 text-[var(--text-secondary)] hover:bg-[var(--hover)] transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#2563EB] text-[10px] text-white font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl">
              <div className="p-3 border-b border-[var(--border)]">
                <p className="text-sm font-medium text-[var(--text-primary)]">Notificações</p>
              </div>
              <div className="max-h-64 overflow-y-auto p-2">
                {notifications.length === 0 ? (
                  <p className="p-3 text-xs text-[var(--text-secondary)] text-center">Nenhuma notificação</p>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <div key={n.id} className={cn('rounded-lg p-3 text-xs', !n.read && 'bg-[#2563EB]/10')}>
                      <p className="font-medium text-[var(--text-primary)]">{n.title}</p>
                      <p className="text-[var(--text-secondary)]">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
          <Wallet className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-[var(--text-primary)]">{user?.balance?.toFixed(2) || '0.00'}</span>
        </div>

        <div className="relative">
          <button
            onClick={() => { setShowDropdown(!showDropdown); setShowNotifications(false); }}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] p-1.5 pr-3 hover:bg-[var(--hover)] transition-colors cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] text-white text-xs font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span className="hidden sm:inline text-sm text-[var(--text-primary)]">{user?.name || 'Usuário'}</span>
          </button>
          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl p-1">
              <Link to="/configuracoes" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--hover)]">
                <User className="w-4 h-4" /> Perfil
              </Link>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
