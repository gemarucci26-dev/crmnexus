import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Megaphone, Users, BarChart3, User } from 'lucide-react';
import { cn } from '../../utils/cn';

const items = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/campanhas', icon: Megaphone, label: 'Campanhas' },
  { to: '/leads', icon: Users, label: 'Leads' },
  { to: '/relatorios', icon: BarChart3, label: 'Relatórios' },
  { to: '/configuracoes', icon: User, label: 'Perfil' },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-[var(--border)] bg-[var(--sidebar)]/95 backdrop-blur-lg md:hidden py-2 px-2">
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-[10px] font-medium transition-all',
              isActive ? 'text-[#60A5FA]' : 'text-[var(--text-secondary)]'
            )
          }
        >
          <Icon className="w-5 h-5" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
