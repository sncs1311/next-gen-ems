'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { LoadingSpinner, ErrorMessage } from '@/components/ui';
import CategoryCard from '@/components/ui/CategoryCard';
import api from '@/lib/api';

const ALL_TYPES = ['Near Miss','Minor Accident','Major Accident','Fire','Equipment Tip-Over','Falling Object','Third-Party Property Damage','Personal Injury'];

export default function IncidentCategoriesPage() {
  const router = useRouter();

  // FIXED: was calling GET /incidents/analytics, which 403'd for SITE_ENG
  // (that endpoint's role list doesn't include them). Sidestepping this by
  // pulling from GET /incidents instead — the same list endpoint the old
  // Incidents page already used successfully for this role — and computing
  // per-type counts client-side. A large pageSize is used so the counts are
  // based on this user's full (project-scoped) incident set, not just one
  // page of 25.
  const { data, isLoading, error } = useQuery({
    queryKey: ['incidents-for-categories'],
    queryFn: async () => { const { data } = await api.get('/incidents?pageSize=500&page=1'); return data; },
  });

  const counts = {};
  let totalDamage = 0;
  if (data?.results) {
    for (const inc of data.results) {
      counts[inc.incidentType] = (counts[inc.incidentType] || 0) + 1;
    }
  }
  const typesWithCounts = ALL_TYPES.map((t) => ({ type: t, count: counts[t] || 0 })).filter((t) => t.count > 0);

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">Incidents</h1>
        <button className="btn-danger" onClick={() => router.push('/incidents/new')}>+ File Report</button>
      </div>

      {isLoading ? <LoadingSpinner /> : error ? <ErrorMessage message={error.message} /> : (
        typesWithCounts.length === 0 ? (
          <div className="card p-10 text-center text-gray-400">No incidents recorded yet.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {typesWithCounts.map((t) => (
              <CategoryCard
                key={t.type}
                title={t.type}
                sub={`${t.count} incident${t.count !== 1 ? 's' : ''}`}
                onClick={() => router.push(`/incidents/list?type=${encodeURIComponent(t.type)}`)}
              />
            ))}
          </div>
        )
      )}
    </AppShell>
  );
}