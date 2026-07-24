'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { LoadingSpinner, ErrorMessage, Pagination, EmptyState } from '@/components/ui';
import api from '@/lib/api';

export default function Page() {
  const router = useRouter();
  const [pg, setPg] = useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: ['maintenance', pg],
    queryFn: async () => { const { data } = await api.get('/maintenance?page=' + pg); return data; },
    retry: false,
  });
  const title = { projects:'Projects', fuel:'Fuel Logs', maintenance:'Maintenance', transfers:'Transfers', incidents:'Incidents' }['maintenance'];
  const newHref = { projects:'/projects/new', fuel:'/fuel/new', maintenance:'/maintenance/job-cards/new', transfers:'/transfers/new', incidents:'/incidents/new' }['maintenance'];
  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        <button className="btn-primary" onClick={() => router.push(newHref)}>+ New</button>
      </div>
      <div className="card">
        {isLoading ? <LoadingSpinner />
          : error ? <div className="p-4"><ErrorMessage message={error.message} /></div>
          : !data?.results?.length ? <EmptyState title={"No " + title.toLowerCase() + " yet"} description="Records will appear here once created." />
          : <div className="p-5 text-sm text-slate-500">{data.total} record(s) loaded. Full table view coming in next build.<br/><pre className="mt-2 text-xs overflow-auto max-h-96">{JSON.stringify(data.results.slice(0,3), null, 2)}</pre></div>
        }
        <Pagination page={pg} pageSize={25} total={data?.total ?? 0} onPage={setPg} />
      </div>
    </AppShell>
  );
}
