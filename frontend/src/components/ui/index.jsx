'use client';

// Asset status badge with colour semantics matching SRS FR-AR-006
export function StatusBadge({ status }) {
  const map = {
    'Active': 'badge-active',
    'Idle': 'badge-idle',
    'Under Maintenance': 'badge-maintenance',
    'In Transit': 'badge-transit',
    'Decommissioned': 'badge-decommissioned',
    'Written Off': 'badge-decommissioned',
  };
  return <span className={map[status] || 'badge-idle'}>{status}</span>;
}

// Driver risk category badge — FR-DR-004
export function RiskBadge({ risk }) {
  const map = { Low: 'badge-low', Medium: 'badge-med', High: 'badge-high' };
  return <span className={map[risk] || 'badge-idle'}>{risk}</span>;
}

// Signature element: monospaced asset/job codes with amber underline
export function AssetCode({ code }) {
  return <span className="asset-code">{code}</span>;
}

export function StatCard({ label, value, sub, accent }) {
  return (
    <div className="stat-card">
      <div className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-2">{label}</div>
      <div className={`text-3xl font-bold ${accent ? 'text-amber-500' : 'text-navy-900'}`}>{value}</div>
      {sub && <div className="text-slate-400 text-xs mt-1">{sub}</div>}
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function ErrorMessage({ message }) {
  return (
    <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {message || 'An error occurred.'}
    </div>
  );
}

export function Pagination({ page, pageSize, total, onPage }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
      <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
      <div className="flex gap-2">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="px-3 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40">Prev</button>
        <button disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="px-3 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="text-center py-16">
      <div className="text-slate-300 text-5xl mb-4">◧</div>
      <div className="text-slate-600 font-medium mb-1">{title}</div>
      <div className="text-slate-400 text-sm mb-4">{description}</div>
      {action}
    </div>
  );
}
