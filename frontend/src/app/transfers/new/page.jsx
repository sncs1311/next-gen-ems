'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { ErrorMessage } from '@/components/ui';
import api from '@/lib/api';

const REASONS = ['Project Mobilization', 'Demobilization', 'Reallocation', 'Breakdown Recovery', 'Return to Yard', 'Other'];

export default function NewTransferPage() {
  const router = useRouter();
  const [form, setForm] = useState({ assetId: '', transferReason: '', reasonDetails: '', sourceProjectId: '', destinationProjectId: '' });
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: (d) => api.post('/transfers', d),
    onSuccess: () => router.push('/transfers'),
    onError: (e) => setErr(e.response?.data?.error || 'Submission failed'),
  });

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  return (
    <AppShell>
      <div className="max-w-xl">
        <button onClick={() => router.push('/transfers')} className="text-slate-400 text-sm mb-3">← Back</button>
        <h1 className="page-title mb-6">Submit Transfer Request</h1>
        {err && <div className="mb-4"><ErrorMessage message={err} /></div>}
        <div className="card p-6 space-y-4">
          <div>
            <label className="form-label">Asset ID *</label>
            <input required className="form-input" placeholder="Paste asset UUID" value={form.assetId} onChange={(e) => set('assetId', e.target.value)} />
            <p className="text-xs text-slate-400 mt-1">Copy from the Asset detail page URL</p>
          </div>
          <div>
            <label className="form-label">Transfer Reason *</label>
            <select required className="form-select" value={form.transferReason} onChange={(e) => set('transferReason', e.target.value)}>
              <option value="">Select reason…</option>
              {REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          {form.transferReason === 'Other' && (
            <div>
              <label className="form-label">Reason Details *</label>
              <textarea rows={2} className="form-input" value={form.reasonDetails} onChange={(e) => set('reasonDetails', e.target.value)} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Source Project ID</label>
              <input className="form-input" placeholder="UUID" value={form.sourceProjectId} onChange={(e) => set('sourceProjectId', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Destination Project ID</label>
              <input className="form-input" placeholder="UUID" value={form.destinationProjectId} onChange={(e) => set('destinationProjectId', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-primary" disabled={mutation.isPending}
              onClick={() => mutation.mutate({ ...form, sourceProjectId: form.sourceProjectId || undefined, destinationProjectId: form.destinationProjectId || undefined })}>
              {mutation.isPending ? 'Submitting…' : 'Submit Request'}
            </button>
            <button className="btn-secondary" onClick={() => router.push('/transfers')}>Cancel</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
