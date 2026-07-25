'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// SVG icons — no emojis, consistent stroke-based style
const ICONS = {
  dashboard: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <rect x="2" y="2" width="7" height="7" rx="1"/><rect x="11" y="2" width="7" height="7" rx="1"/>
      <rect x="2" y="11" width="7" height="7" rx="1"/><rect x="11" y="11" width="7" height="7" rx="1"/>
    </svg>
  ),
  assets: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <rect x="2" y="6" width="16" height="11" rx="1.5"/>
      <path d="M6 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      <path d="M10 11v2M8 11h4"/>
    </svg>
  ),
  drivers: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <circle cx="10" cy="7" r="3.5"/>
      <path d="M3 18c0-3.314 3.134-6 7-6s7 2.686 7 6"/>
    </svg>
  ),
  projects: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M2 5h16M2 10h10M2 15h6"/>
      <circle cx="16" cy="13" r="3"/><path d="M16 11v2l1 1"/>
    </svg>
  ),
  fuel: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <rect x="3" y="3" width="9" height="14" rx="1.5"/>
      <path d="M12 7h2a2 2 0 0 1 2 2v4a1 1 0 0 0 2 0V8l-2-2"/>
      <path d="M6 7h3M6 10h3"/>
    </svg>
  ),
  maintenance: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M14.7 3.3a4 4 0 0 0-5.1 5.1L3 15a1.4 1.4 0 0 0 2 2l6.6-6.6a4 4 0 0 0 5.1-5.1l-2.3 2.3-1.5-.5-.5-1.5 2.3-2.3z"/>
    </svg>
  ),
  transfers: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M4 7h12M13 4l3 3-3 3M16 13H4M7 10l-3 3 3 3"/>
    </svg>
  ),
  incidents: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M10 2L2 17h16L10 2z"/>
      <path d="M10 8v4M10 14.5v.5"/>
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <circle cx="10" cy="10" r="2.5"/>
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"/>
    </svg>
  ),
};

const NAV = [
  { href: '/dashboard',   label: 'Dashboard',   icon: 'dashboard',   roles: ['EXEC','FLEET_MGR','SITE_ENG','PM','MECH','MECH_SUP','HSE','FINANCE','SYS_ADMIN'] },
  { href: '/assets',      label: 'Assets',       icon: 'assets',      roles: ['EXEC','FLEET_MGR','SITE_ENG','PM','MECH','MECH_SUP','FINANCE','SYS_ADMIN'] },
  { href: '/drivers',     label: 'Drivers',      icon: 'drivers',     roles: ['FLEET_MGR','SITE_ENG','HSE','SYS_ADMIN'] },
  { href: '/projects',    label: 'Projects',     icon: 'projects',    roles: ['FLEET_MGR','SITE_ENG','PM','EXEC','SYS_ADMIN'] },
  { href: '/fuel',        label: 'Fuel',         icon: 'fuel',        roles: ['FLEET_MGR','SITE_ENG','MECH','SYS_ADMIN'] },
  { href: '/maintenance', label: 'Maintenance',  icon: 'maintenance', roles: ['FLEET_MGR','MECH','MECH_SUP','SYS_ADMIN'] },
  { href: '/transfers',   label: 'Transfers',    icon: 'transfers',   roles: ['FLEET_MGR','SITE_ENG','PM','SYS_ADMIN'] },
  { href: '/incidents',   label: 'Incidents',    icon: 'incidents',   roles: ['FLEET_MGR','SITE_ENG','HSE','SYS_ADMIN'] },
  { href: '/admin',       label: 'Admin',        icon: 'admin',       roles: ['SYS_ADMIN'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const visible = NAV.filter((n) => !user || n.roles.includes(user.role));

  return (
    <aside className="sidebar">
      {/* Brand — wordmark only, no icon box */}
      <div className="px-5 py-5 border-b border-slate-700">
        <div className="text-white font-bold text-base tracking-tight leading-tight">FleetCore</div>
        <div className="text-slate-500 text-xs leading-tight mt-0.5">Equipment Management System</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {visible.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-white/10 text-white border-r-2 border-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                {ICONS[item.icon]}
              </span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      {user && (
        <div className="px-5 py-4 border-t border-slate-700">
          <div className="text-white text-sm font-medium truncate">{user.fullName}</div>
          <div className="text-slate-500 text-xs mb-3">{user.role}</div>
          <button onClick={logout} className="text-slate-400 hover:text-white text-xs transition-colors">
            Sign out →
          </button>
        </div>
      )}
    </aside>
  );
}

