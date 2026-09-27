'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { StatCard, LoadingSpinner, StatusBadge, AssetCode } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import CategoryCard from '@/components/ui/CategoryCard';

// What each role sees in the activity panels — UNCHANGED for every role
// except SITE_ENG, which now gets its own card-based home screen below.
// This mapping still governs EXEC/FLEET_MGR/PM/MECH/MECH_SUP/HSE/FINANCE/
// SYS_ADMIN until their dashboards get the same treatment.
const ROLE_PANELS = {
  EXEC:      ['assets-maintenance', 'incidents'],
  FLEET_MGR: ['assets-maintenance', 'transfers-queue', 'incidents'],
  PM:        ['assets-maintenance', 'transfers'],
  MECH:      ['assets-maintenance'],
  MECH_SUP:  ['assets-maintenance'],
  HSE:       ['incidents'],
  FINANCE:   ['assets-maintenance'],
  SYS_ADMIN: ['assets-maintenance', 'transfers-queue', 'incidents'],
};

function AssetsUnderMaintenance() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['dash-maintenance'],
    queryFn: async () => {
      const { data } = await api.get('/assets?status=Under Maintenance&pageSize=5&page=1');
      return data;
    },
    retry: false,
  });
  return (
    <div className="card">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Under Maintenance</h2>
        <button onClick={() => router.push('/assets?status=Under+Maintenance')} className="text-gray-500 hover:text-gray-800 text-sm">View all →</button>
      </div>
      {isLoading ? <LoadingSpinner /> : (
        <div className="divide-y divide-gray-100">
          {!(data?.results?.length) ? (
            <p className="px-5 py-8 text-center text-gray-400 text-sm">No assets under maintenance</p>
          ) : data.results.map((a) => (
            // FIXED: routes by assetNumber, not the raw UUID (a.id).
            <div key={a.id} className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              onClick={() => router.push(`/assets/${a.assetNumber}`)}>
              <div>
                <AssetCode code={a.assetNumber} />
                <span className="text-gray-500 text-sm ml-2">{a.make} {a.model}</span>
              </div>
              <StatusBadge status={a.currentStatus} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TransferQueue() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['dash-transfer-queue'],
    queryFn: async () => { const { data } = await api.get('/transfers/queue'); return data; },
    retry: false,
  });
  return (
    <div className="card">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Transfer Approval Queue</h2>
        <button onClick={() => router.push('/transfers')} className="text-gray-500 hover:text-gray-800 text-sm">View all →</button>
      </div>
      {isLoading ? <LoadingSpinner /> : (
        <div className="divide-y divide-gray-100">
          {!(data?.length) ? (
            <p className="px-5 py-8 text-center text-gray-400 text-sm">No pending transfer requests</p>
          ) : data.slice(0, 5).map((t) => (
            <div key={t.id} className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              onClick={() => router.push('/transfers')}>
              <div>
                <AssetCode code={t.transferNumber} />
                <span className="text-gray-500 text-sm ml-2">{t.transferReason}</span>
              </div>
              <span className="badge-maintenance">Pending</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentIncidents() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['dash-incidents'],
    queryFn: async () => { const { data } = await api.get('/incidents?pageSize=5&page=1'); return data; },
    retry: false,
  });

  const TYPE_COLORS = {
    'Near Miss': 'badge-maintenance',
    'Minor Accident': 'badge-maintenance',
    'Major Accident': 'badge-decommissioned',
    'Personal Injury': 'badge-decommissioned',
    'Fire': 'badge-decommissioned',
    'Equipment Tip-Over': 'badge-decommissioned',
  };

  return (
    <div className="card">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Recent Incidents</h2>
        <button onClick={() => router.push('/incidents')} className="text-gray-500 hover:text-gray-800 text-sm">View all →</button>
      </div>
      {isLoading ? <LoadingSpinner /> : (
        <div className="divide-y divide-gray-100">
          {!(data?.results?.length) ? (
            <p className="px-5 py-8 text-center text-gray-400 text-sm">No incidents recorded</p>
          ) : data.results.map((inc) => (
            <div key={inc.id} className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              onClick={() => router.push(`/incidents/${inc.id}`)}>
              <div>
                <span className="font-mono text-sm text-gray-700">{inc.incidentNumber}</span>
                <span className="text-gray-400 text-xs ml-2">{new Date(inc.occurredAt).toLocaleDateString()}</span>
              </div>
              <span className={TYPE_COLORS[inc.incidentType] || 'badge-idle'}>{inc.incidentType}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentTransfers() {
  const router = useRouter();
  return (
    <div className="card">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Transfers</h2>
        <button onClick={() => router.push('/transfers')} className="text-gray-500 hover:text-gray-800 text-sm">Go to Transfers →</button>
      </div>
      <div className="px-5 py-8 text-center text-gray-400 text-sm">
        Submit and track equipment transfer requests from the Transfers page.
      </div>
    </div>
  );
}

const PANEL_COMPONENTS = {
  'assets-maintenance': AssetsUnderMaintenance,
  'transfers-queue':    TransferQueue,
  'incidents':          RecentIncidents,
  'transfers':          RecentTransfers,
};

// ADDED — Site Engineer's card-based home screen. Categories map to the
// modules they actually use day-to-day: Assets, Drivers, Fuel, Transfers,
// Incidents. No separate Projects card — a Site Engineer is scoped to one
// project already, shown via ProjectBadge in the header.
const SITE_ENG_CATEGORIES = [
  { key: 'assets',    label: 'Assets',    href: '/assets',    desc: 'Equipment at your site' },
  { key: 'drivers',   label: 'Drivers',   href: '/drivers',   desc: 'Operators assigned to your site' },
  { key: 'fuel',      label: 'Fuel',      href: '/fuel',      desc: 'Consumption, cost, and logs' },
  { key: 'transfers', label: 'Transfers', href: '/transfers', desc: 'Submit and track equipment moves' },
  { key: 'incidents', label: 'Incidents', href: '/incidents', desc: 'Safety reports for your site' },
];

function SiteEngineerHome() {
  const router = useRouter();
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {SITE_ENG_CATEGORIES.map((cat) => (
        <CategoryCard
          key={cat.key}
          title={cat.label}
          description={cat.desc}
          onClick={() => router.push(cat.href)}
        />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['fleet-stats'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/fleet-stats');
      return data;
    },
    retry: false,
    enabled: user?.role !== 'SITE_ENG', // Site Engineer's home doesn't use fleet-wide KPIs
  });

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {user?.role === 'SITE_ENG' ? (
        <SiteEngineerHome />
      ) : (
        <>
          {['EXEC','FLEET_MGR','SYS_ADMIN'].includes(user?.role) && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {statsLoading ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="stat-card animate-pulse"><div className="h-8 bg-gray-100 rounded w-16 mb-2"/><div className="h-4 bg-gray-50 rounded w-24"/></div>
                ))
              ) : stats ? (
                <>
                  <StatCard label="Total Assets" value={stats.totalAssets ?? '—'} sub="In fleet" />
                  <StatCard label="Fleet Utilization" value={stats.utilizationRate ? `${stats.utilizationRate}%` : '—'} sub="This month" />
                  <StatCard label="MTBF" value={stats.mtbf ? `${stats.mtbf}h` : '—'} sub="Mean Time Between Failures" />
                  <StatCard label="MTTR" value={stats.mttr ? `${stats.mttr}h` : '—'} sub="Mean Time To Repair" />
                </>
              ) : (
                <>
                  <StatCard label="Total Assets" value="—" sub="Analytics computed in Phase 3" />
                  <StatCard label="Fleet Utilization" value="—" sub="Analytics computed in Phase 3" />
                  <StatCard label="MTBF" value="—" sub="Analytics computed in Phase 3" />
                  <StatCard label="MTTR" value="—" sub="Analytics computed in Phase 3" />
                </>
              )}
            </div>
          )}

          <div className={`grid gap-6 ${(ROLE_PANELS[user?.role] || ['assets-maintenance']).length === 1 ? 'grid-cols-1 max-w-2xl' : 'grid-cols-1 lg:grid-cols-2'}`}>
            {(ROLE_PANELS[user?.role] || ['assets-maintenance']).map((key) => {
              const Component = PANEL_COMPONENTS[key];
              return Component ? <Component key={key} /> : null;
            })}
          </div>
        </>
      )}
    </AppShell>
  );
}