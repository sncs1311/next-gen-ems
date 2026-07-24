'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { ErrorMessage } from '@/components/ui';
import api from '@/lib/api';

export default function NewAssetPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    subTypeId: '', make: '', model: '', yearOfManufacture: new Date().getFullYear(), ownershipType: 'Owned', color: '', notes: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const { data: subTypes } = useQuery({
    queryKey: ['asset-subtypes'],
    queryFn: async () => { const { data } = await api.get('/assets/subtypes'); return data; },
    retry: false,
  });

  // Grouped by category for the select
  const grouped = (subTypes || []).reduce((acc, s) => {
    const cat = s.category?.categoryName || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const mutation = useMutation({
    mutationFn: (data) => api.post('/assets', data),
    onSuccess: (res) => router.push(`/assets/${res.data.id}`),
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
    mutation.mutate({ ...form, yearOfManufacture: Number(form.yearOfManufacture) });
  }

  return (
    <AppShell>
      <div className="max-w-2xl">
        <div className="mb-6">
          <button onClick={() => router.push('/assets')} className="text-slate-400 hover:text-slate-600 text-sm mb-2">← Back</button>
          <h1 className="page-title">Register New Asset</h1>
          <p className="text-slate-400 text-sm">Asset number is auto-generated (EQ-YYYY-NNNN)</p>
        </div>

        {mutation.error && !Object.keys(fieldErrors).length && (
          <div className="mb-4"><ErrorMessage message={mutation.error.response?.data?.error || 'Registration failed'} /></div>
        )}

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Asset Sub-Type *</label>
              <select required value={form.subTypeId} onChange={(e) => set('subTypeId', e.target.value)} className="form-select">
                <option value="">Select sub-type…</option>
                {Object.entries(grouped).map(([cat, items]) => (
                  <optgroup key={cat} label={cat}>
                    {items.map((s) => <option key={s.id} value={s.id}>{s.subTypeName}</option>)}
                  </optgroup>
                ))}
              </select>
              {fieldErrors.subTypeId && <p className="form-error">{fieldErrors.subTypeId}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Make *</label>
                <input required className="form-input" value={form.make} onChange={(e) => set('make', e.target.value)} placeholder="e.g. Caterpillar" />
                {fieldErrors.make && <p className="form-error">{fieldErrors.make}</p>}
              </div>
              <div>
                <label className="form-label">Model *</label>
                <input required className="form-input" value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="e.g. 320D" />
                {fieldErrors.model && <p className="form-error">{fieldErrors.model}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Year of Manufacture *</label>
                <input required type="number" className="form-input" min={1980} max={new Date().getFullYear() + 1}
                  value={form.yearOfManufacture} onChange={(e) => set('yearOfManufacture', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Ownership Type *</label>
                <select required className="form-select" value={form.ownershipType} onChange={(e) => set('ownershipType', e.target.value)}>
                  <option>Owned</option>
                  <option>Leased</option>
                  <option>Hired</option>
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Color</label>
              <input className="form-input" value={form.color} onChange={(e) => set('color', e.target.value)} placeholder="e.g. Yellow" />
            </div>

            <div>
              <label className="form-label">Notes</label>
              <textarea rows={3} className="form-input" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Any additional notes…" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={mutation.isPending} className="btn-primary">
                {mutation.isPending ? 'Registering…' : 'Register Asset'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => router.push('/assets')}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
