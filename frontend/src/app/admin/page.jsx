'use client';
import AppShell from '@/components/layout/AppShell';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  return (
    <AppShell>
      <h1 className="page-title mb-2">System Administration</h1>
      <p className="text-gray-400 text-sm mb-6">SYS_ADMIN access only</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: 'User Accounts', desc: 'Create, activate and deactivate user accounts — FR-SA-001', href: '/admin/users', ready: true },
          { label: 'System Configuration', desc: 'Anomaly thresholds, alert timings, score weights — FR-SA-004', href: '/admin/config', ready: false },
          { label: 'Lookup Tables', desc: 'Asset categories, fault types, training types — FR-SA-005', href: '/admin/lookups', ready: false },
          { label: 'Audit Log', desc: 'Read-only operation history — FR-SA-003', href: '/admin/audit', ready: false },
        ].map((item) => (
          <button key={item.href}
            onClick={() => item.ready && router.push(item.href)}
            className={`card p-5 text-left transition-colors ${item.ready ? 'hover:border-gray-400 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="font-semibold text-gray-900">{item.label}</div>
              {item.ready
                ? <span className="badge-active text-xs">Available</span>
                : <span className="badge-idle text-xs">Phase 5</span>}
            </div>
            <div className="text-sm text-gray-400">{item.desc}</div>
          </button>
        ))}
      </div>
    </AppShell>
  );
}
