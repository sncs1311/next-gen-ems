'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { ErrorMessage } from '@/components/ui';
import api from '@/lib/api';

const FAULT_CATEGORIES = ['Engine', 'Hydraulics', 'Electrical', 'Structural', 'Tyres', 'Brakes', 'Transmission', 'Cooling System', 'Other'];

export default function NewBreakdownPage() {
  const router = useRouter();
  const [form, setForm] = useState({ assetId: '', driverId: '', projectId: '', occurredAt: '', symptomDescription: '', faultCategory: '' });
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: (d) => api.post('/maintenance/breakdowns', d),
    onSuccess: (res) => {
      alert(`Breakdown logged: ${res.data.breakdownNumber}\nAsset status set to Under Maintenance.`);
      router.push('/maintenance');
    },
    onError: (e) => setErr(e.response?.data?.error || 'Failed to report breakdown'),
  });

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  return (
    <AppShell>
      <div className="max-w-xl">
        <button onClick={() => router.push('/maintenance')} className="text-slate-400 text-sm mb-2">← Back</button>
        <h1 className="page-title mb-1">Report Breakdown</h1>
        <p className="text-slate-400 text-sm mb-6">Asset status will be set to Under Maintenance immediately on submission</p>
        {err && <div className="mb-4"><ErrorMessage message={err} /></div>}
        <div className="card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="form-label">Asset ID *</label><input required className="form-input font-mono" placeholder="UUID" value={form.assetId} onChange={(e) => set('assetId', e.target.value)} /></div>
            <div><label className="form-label">Driver ID *</label><input required className="form-input font-mono" placeholder="UUID" value={form.driverId} onChange={(e) => set('driverId', e.target.value)} /></div>
          </div>
          <div>
            <label className="form-label">Project ID</label>
            <input className="form-input font-mono" placeholder="UUID (if breakdown is on-site)" value={form.projectId} onChange={(e) => set('projectId', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Date & Time of Breakdown *</label>
            <input required type="datetime-local" className="form-input" value={form.occurredAt} onChange={(e) => set('occurredAt', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Fault Category *</label>
            <select required className="form-select" value={form.faultCategory} onChange={(e) => set('faultCategory', e.target.value)}>
              <option value="">Select…</option>
              {FAULT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Symptom Description *</label>
            <textarea required rows={3} className="form-input" placeholder="Describe what the operator observed…" value={form.symptomDescription} onChange={(e) => set('symptomDescription', e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-danger" disabled={mutation.isPending}
              onClick={() => mutation.mutate({ ...form, occurredAt: form.occurredAt ? new Date(form.occurredAt).toISOString() : undefined, projectId: form.projectId || undefined })}>
              {mutation.isPending ? 'Reporting…' : 'Report Breakdown'}
            </button>
            <button className="btn-secondary" onClick={() => router.push('/maintenance')}>Cancel</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
