'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { RiskBadge, AssetCode, LoadingSpinner, ErrorMessage, Pagination, EmptyState } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

const CAN_CREATE = ['FLEET_MGR', 'SYS_ADMIN'];

export default function DriversPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [filters, setFilters] = useState({ q: '', riskCategory: '', page: 1 });

  const { data, isLoading, error } = useQuery({
    queryKey: ['drivers', filters],
    queryFn: async () => {
      const params = new URLSearchParams({ page: filters.page });
      if (filters.q) params.set('q', filters.q);
      if (filters.riskCategory) params.set('riskCategory', filters.riskCategory);
      const { data } = await api.get(`/drivers?${params}`);
      return data;
    },
  });

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">Driver Registry</h1>
        {CAN_CREATE.includes(user?.role) && (
          <button className="btn-primary" onClick={() => router.push('/drivers/new')}>+ Register Driver</button>
        )}
      </div>

      <div className="card mb-4 p-4 flex flex-wrap gap-3">
        <input type="text" placeholder="Search by name or employee code…" value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value, page: 1 })} className="form-input max-w-xs" />
        <select value={filters.riskCategory}
          onChange={(e) => setFilters({ ...filters, riskCategory: e.target.value, page: 1 })} className="form-select w-40">
          <option value="">All risk levels</option>
          <option>Low</option><option>Medium</option><option>High</option>
        </select>
      </div>

      <div className="card">
        {isLoading ? <LoadingSpinner /> : error ? <div className="p-4"><ErrorMessage message={error.message} /></div> : (
          <>
            {data?.results?.length === 0
              ? <EmptyState title="No drivers found" description="Register a driver to get started." />
              : (
                <table className="table-base">
                  <thead>
                    <tr><th>Employee Code</th><th>Full Name</th><th>License Category</th><th>License Expiry</th><th>Risk</th><th></th></tr>
                  </thead>
                  <tbody>
                    {data.results.map((d) => {
                      const lic = d.driverLicenseDriverIdList?.[0];
                      const expiry = lic?.expiryDate ? new Date(lic.expiryDate) : null;
                      const expired = expiry && expiry < new Date();
                      return (
                        <tr key={d.id} className="cursor-pointer" onClick={() => router.push(`/drivers/${d.id}`)}>
                          <td><AssetCode code={d.employee?.employeeCode} /></td>
                          <td className="font-medium">{d.employee?.fullName}</td>
                          <td className="text-slate-500">{lic?.licenseCategory ?? '—'}</td>
                          <td className={expired ? 'text-red-500 font-medium' : 'text-slate-500'}>
                            {expiry ? expiry.toLocaleDateString() : '—'}{expired ? ' ⚠' : ''}
                          </td>
                          <td><RiskBadge risk={d.driverBehaviorScoreDriverId?.riskCategory ?? 'Low'} /></td>
                          <td className="text-right"><button className="text-amber-500 hover:underline text-sm">View →</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            <Pagination page={filters.page} pageSize={25} total={data?.total ?? 0}
              onPage={(p) => setFilters({ ...filters, page: p })} />
          </>
        )}
      </div>
    </AppShell>
  );
}
