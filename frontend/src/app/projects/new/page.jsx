'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { ErrorMessage } from '@/components/ui';
import api from '@/lib/api';

const SECTORS = ['Oil & Gas', 'Refinery', 'Infrastructure', 'Construction', 'Marine', 'Other'];
const GCC_COUNTRIES = ['Qatar', 'UAE', 'Saudi Arabia', 'Oman', 'Kuwait', 'Bahrain'];

export default function NewProjectPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    projectName: '', clientName: '', sector: '', city: '', country: '',
    startDate: '', plannedCompletionDate: '', projectManagerId: '',
    siteGpsLat: '', siteGpsLng: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const mutation = useMutation({
    mutationFn: (d) => api.post('/projects', d),
    onSuccess: (res) => router.push(`/projects/${res.data.id}`),
    onError: (err) => {
      if (err.response?.data?.errors) {
        const map = {};
        err.response.data.errors.forEach((e) => { map[e.field] = e.message; });
        setFieldErrors(map);
      }
    },
  });

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function handleSubmit(e) {
    e.preventDefault();
    setFieldErrors({});
    const payload = { ...form };
    if (!payload.siteGpsLat) delete payload.siteGpsLat; else payload.siteGpsLat = Number(payload.siteGpsLat);
    if (!payload.siteGpsLng) delete payload.siteGpsLng; else payload.siteGpsLng = Number(payload.siteGpsLng);
    mutation.mutate(payload);
  }

  return (
    <AppShell>
      <div className="max-w-2xl">
        <button onClick={() => router.push('/projects')} className="text-slate-400 text-sm mb-2">← Back</button>
        <h1 className="page-title mb-1">Register New Project</h1>
        <p className="text-slate-400 text-sm mb-6">Project code is auto-generated (PRJ-[COUNTRY]-YYYY-NNN)</p>

        {mutation.error && !Object.keys(fieldErrors).length && (
          <div className="mb-4"><ErrorMessage message={mutation.error.response?.data?.error || 'Registration failed'} /></div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card p-6">
            <h2 className="font-semibold text-navy-800 mb-4">Project Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="form-label">Project Name *</label>
                <input required className="form-input" value={form.projectName} onChange={(e) => set('projectName', e.target.value)} placeholder="e.g. Ras Laffan Refinery Expansion" />
                {fieldErrors.projectName && <p className="form-error">{fieldErrors.projectName}</p>}
              </div>
              <div>
                <label className="form-label">Client Name *</label>
                <input required className="form-input" value={form.clientName} onChange={(e) => set('clientName', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Sector *</label>
                <select required className="form-select" value={form.sector} onChange={(e) => set('sector', e.target.value)}>
                  <option value="">Select…</option>
                  {SECTORS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">City *</label>
                <input required className="form-input" value={form.city} onChange={(e) => set('city', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Country *</label>
                <select required className="form-select" value={form.country} onChange={(e) => set('country', e.target.value)}>
                  <option value="">Select…</option>
                  {GCC_COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Start Date *</label>
                <input required type="date" className="form-input" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Planned Completion *</label>
                <input required type="date" className="form-input" value={form.plannedCompletionDate} onChange={(e) => set('plannedCompletionDate', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="form-label">Project Manager ID *</label>
                <input required className="form-input font-mono" placeholder="UUID of the PM's Employee record" value={form.projectManagerId} onChange={(e) => set('projectManagerId', e.target.value)} />
                <p className="text-xs text-slate-400 mt-1">Must be an Employee record with PM or FLEET_MGR role</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-navy-800 mb-4">GPS Coordinates (optional)</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Latitude</label>
                <input type="number" step="any" className="form-input" placeholder="25.2854" value={form.siteGpsLat} onChange={(e) => set('siteGpsLat', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Longitude</label>
                <input type="number" step="any" className="form-input" placeholder="51.5310" value={form.siteGpsLng} onChange={(e) => set('siteGpsLng', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Registering…' : 'Register Project'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => router.push('/projects')}>Cancel</button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
