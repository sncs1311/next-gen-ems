'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const NAV = [
  { href: '/dashboard',   label: 'Dashboard',    icon: '▦', roles: ['EXEC','FLEET_MGR','SITE_ENG','PM','MECH','MECH_SUP','HSE','FINANCE','SYS_ADMIN'] },
  { href: '/assets',      label: 'Assets',        icon: '◧', roles: ['EXEC','FLEET_MGR','SITE_ENG','PM','MECH','MECH_SUP','FINANCE','SYS_ADMIN'] },
  { href: '/drivers',     label: 'Drivers',       icon: '◉', roles: ['FLEET_MGR','SITE_ENG','HSE','SYS_ADMIN'] },
  { href: '/projects',    label: 'Projects',      icon: '⬡', roles: ['FLEET_MGR','SITE_ENG','PM','EXEC','SYS_ADMIN'] },
  { href: '/fuel',        label: 'Fuel',          icon: '⛽', roles: ['FLEET_MGR','SITE_ENG','MECH','SYS_ADMIN'] },
  { href: '/maintenance', label: 'Maintenance',   icon: '⚙', roles: ['FLEET_MGR','MECH','MECH_SUP','SYS_ADMIN'] },
  { href: '/transfers',   label: 'Transfers',     icon: '⇄',  roles: ['FLEET_MGR','SITE_ENG','PM','SYS_ADMIN'] },
  { href: '/incidents',   label: 'Incidents',     icon: '⚠',  roles: ['FLEET_MGR','SITE_ENG','HSE','SYS_ADMIN'] },
  { href: '/admin',       label: 'Admin',         icon: '⚿',  roles: ['SYS_ADMIN'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const visible = NAV.filter((n) => !user || n.roles.includes(user.role));

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-700 flex items-center gap-3">
        <div className="w-8 h-8 bg-amber-500 rounded-md flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">E</span>
        </div>
        <div>
          <div className="text-white font-bold text-sm leading-tight">EMS Portal</div>
          <div className="text-slate-400 text-xs leading-tight">Fleet Operations</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {visible.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-amber-500/10 text-amber-400 border-r-2 border-amber-500'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      {user && (
        <div className="px-5 py-4 border-t border-slate-700">
          <div className="text-white text-sm font-medium truncate">{user.fullName}</div>
          <div className="text-slate-400 text-xs mb-3">{user.role}</div>
          <button
            onClick={logout}
            className="text-slate-400 hover:text-white text-xs transition-colors"
          >
            Sign out →
          </button>
        </div>
      )}
    </aside>
  );
}
