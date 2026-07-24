'use client';
import AppShell from '@/components/layout/AppShell';

export default function AdminPage() {
  return (
    <AppShell>
      <h1 className="page-title mb-6">System Administration</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: 'User Accounts', desc: 'Create, edit, deactivate users — FR-SA-001', href: '/admin/users' },
          { label: 'System Configuration', desc: 'Thresholds, alert timings, score weights — FR-SA-004', href: '/admin/config' },
          { label: 'Lookup Tables', desc: 'Asset categories, fault types, training types — FR-SA-005', href: '/admin/lookups' },
          { label: 'Audit Log', desc: 'Read-only operation history — FR-SA-003', href: '/admin/audit' },
        ].map((item) => (
          <a key={item.href} href={item.href} className="card p-5 hover:border-amber-300 border-2 border-transparent transition-colors block">
            <div className="font-semibold text-navy-800 mb-1">{item.label}</div>
            <div className="text-sm text-slate-400">{item.desc}</div>
          </a>
        ))}
      </div>
    </AppShell>
  );
}
