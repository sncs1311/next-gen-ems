'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppShell from '@/components/layout/AppShell';
import { LoadingSpinner, ErrorMessage } from '@/components/ui';
import api from '@/lib/api';

const ROLE_DESCRIPTIONS = {
  EXEC: 'Executive — read-only KPI dashboard',
  FLEET_MGR: 'Fleet Manager — full operations access',
  SITE_ENG: 'Site Engineer — fuel, transfers, breakdowns',
  PM: 'Project Manager — project and transfer access',
  MECH: 'Workshop Mechanic — job cards and repairs',
  MECH_SUP: 'Workshop Supervisor — close job cards',
  HSE: 'HSE Officer — incidents and safety',
  FINANCE: 'Finance User — cost and TCO reports',
  SYS_ADMIN: 'System Admin — full system access',
};

const EMPTY = {
  employeeCode: '', fullName: '', email: '', password: '',
  roleCode: '', jobTitle: '', nationality: '', department: '', phone: '',
};

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => { const { data } = await api.get('/admin/users'); return data; },
  });

  const { data: roles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => { const { data } = await api.get('/admin/roles'); return data; },
  });

  const createMutation = useMutation({
    mutationFn: (d) => api.post('/admin/users', d),
    onSuccess: () => {
      qc.invalidateQueries(['admin-users']);
      setForm(EMPTY);
      setShowForm(false);
      setFieldErrors({});
    },
    onError: (err) => {
      if (err.response?.data?.errors) {
        const map = {};
        err.response.data.errors.forEach((e) => { map[e.field] = e.message; });
        setFieldErrors(map);
      }
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.patch(`/admin/users/${id}/active`, { isActive }),
    onSuccess: () => qc.invalidateQueries(['admin-users']),
  });

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function handleSubmit(e) {
    e.preventDefault();
    setFieldErrors({});
    const payload = { ...form };
    if (!payload.department) delete payload.department;
    if (!payload.phone) delete payload.phone;
    createMutation.mutate(payload);
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Accounts</h1>
          <p className="text-gray-400 text-sm mt-1">FR-SA-001 — Create and manage system user accounts</p>
        </div>
        <button className="btn-primary" onClick={() => { setShowForm(true); setFieldErrors({}); }}>
          + Create User
        </button>
      </div>

      {/* Create user form */}
      {showForm && (
        <div className="card mb-6 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">New User Account</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕ Cancel</button>
          </div>

          {createMutation.error && !Object.keys(fieldErrors).length && (
            <div className="mb-4"><ErrorMessage message={createMutation.error.response?.data?.error || 'Creation failed'} /></div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Employee Code *</label>
                <input required className="form-input font-mono" placeholder="EMP-0002"
                  value={form.employeeCode} onChange={(e) => set('employeeCode', e.target.value)} />
                {fieldErrors.employeeCode && <p className="form-error">{fieldErrors.employeeCode}</p>}
              </div>
              <div>
                <label className="form-label">Full Name *</label>
                <input required className="form-input" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
                {fieldErrors.fullName && <p className="form-error">{fieldErrors.fullName}</p>}
              </div>
              <div>
                <label className="form-label">Email *</label>
                <input required type="email" className="form-input" value={form.email} onChange={(e) => set('email', e.target.value)} />
                {fieldErrors.email && <p className="form-error">{fieldErrors.email}</p>}
              </div>
              <div>
                <label className="form-label">Password * <span className="text-gray-400 font-normal">(min 8 chars)</span></label>
                <input required type="password" minLength={8} className="form-input"
                  value={form.password} onChange={(e) => set('password', e.target.value)} />
                {fieldErrors.password && <p className="form-error">{fieldErrors.password}</p>}
              </div>
              <div className="col-span-2">
                <label className="form-label">Role *</label>
                <select required className="form-select" value={form.roleCode} onChange={(e) => set('roleCode', e.target.value)}>
                  <option value="">Select a role…</option>
                  {(roles || []).map((r) => (
                    <option key={r.roleCode} value={r.roleCode}>
                      {r.roleName} — {r.description}
                    </option>
                  ))}
                </select>
                {form.roleCode && (
                  <p className="text-xs text-gray-400 mt-1">{ROLE_DESCRIPTIONS[form.roleCode]}</p>
                )}
                {fieldErrors.roleCode && <p className="form-error">{fieldErrors.roleCode}</p>}
              </div>
              <div>
                <label className="form-label">Job Title *</label>
                <input required className="form-input" value={form.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Nationality *</label>
                <input required className="form-input" value={form.nationality} onChange={(e) => set('nationality', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Department</label>
                <input className="form-input" placeholder="e.g. Fleet Operations" value={form.department} onChange={(e) => set('department', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                {createMutation.isPending ? 'Creating…' : 'Create Account'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">All Accounts <span className="text-gray-400 font-normal text-sm ml-2">{users?.length ?? 0} users</span></h2>
        </div>

        {isLoading ? <LoadingSpinner />
          : error ? <div className="p-4"><ErrorMessage message={error.message} /></div>
          : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>Employee Code</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(users || []).map((u) => (
                  <tr key={u.id}>
                    <td><span className="font-mono text-sm">{u.employeeCode}</span></td>
                    <td className="font-medium">{u.fullName}</td>
                    <td className="text-gray-500 text-sm">{u.email}</td>
                    <td>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border ${
                        u.role.roleCode === 'SYS_ADMIN' ? 'bg-gray-900 text-white border-gray-900' :
                        u.role.roleCode === 'FLEET_MGR' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        u.role.roleCode === 'EXEC' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                        'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>{u.role.roleName}</span>
                    </td>
                    <td className="text-gray-500 text-sm">{u.department ?? '—'}</td>
                    <td>
                      <span className={u.isActive ? 'badge-active' : 'badge-decommissioned'}>
                        {u.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td>
                      {/* Prevent deactivating your own account */}
                      <button
                        disabled={toggleMutation.isPending}
                        onClick={() => toggleMutation.mutate({ id: u.id, isActive: !u.isActive })}
                        className={`text-xs font-medium hover:underline ${u.isActive ? 'text-red-600' : 'text-green-700'}`}
                      >
                        {u.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {/* Role reference card */}
      <div className="card mt-6 p-5">
        <h3 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide text-gray-500">Role Reference</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {Object.entries(ROLE_DESCRIPTIONS).map(([code, desc]) => (
            <div key={code} className="flex items-start gap-2 text-sm">
              <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mt-0.5 shrink-0">{code}</span>
              <span className="text-gray-500">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
