'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { ErrorMessage } from '@/components/ui';
import api from '@/lib/api';

const FAULT_CATEGORIES = ['Engine', 'Hydraulics', 'Electrical', 'Structural', 'Tyres', 'Brakes', 'Transmission', 'Cooling System', 'Other'];
const SERVICE_TYPES = ['Engine Oil Change', 'Oil Filter', 'Air Filter', 'Fuel Filter', 'Hydraulic Oil Change', 'Greasing Schedule', 'Full OEM Inspection', 'Other'];

export default function NewJobCardPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    assetId: '', jobCardType: 'Corrective', workshopType: 'Internal',
    breakdownLogId: '', serviceType: '', faultDescription: '', faultCategory: '',
    vendorId: '', projectId: '', meterReadingAtOpenHours: '', meterReadingAtOpenKm: '',
  });
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: (d) => api.post('/maintenance/job-cards', d),
    onSuccess: () => {
      alert('Job card created successfully.');
      router.push('/maintenance');
    },
    onError: (e) => setErr(e.response?.data?.error || 'Failed to create job card'),
  });

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    const payload = { ...form };
    if (!payload.breakdownLogId) delete payload.breakdownLogId;
    if (!payload.vendorId) delete payload.vendorId;
    if (!payload.projectId) delete payload.projectId;
    if (!payload.serviceType) delete payload.serviceType;
    if (!payload.faultCategory) delete payload.faultCategory;
    if (!payload.faultDescription) delete payload.faultDescription;
    if (payload.meterReadingAtOpenHours) payload.meterReadingAtOpenHours = Number(payload.meterReadingAtOpenHours);
    else delete payload.meterReadingAtOpenHours;
    if (payload.meterReadingAtOpenKm) payload.meterReadingAtOpenKm = Number(payload.meterReadingAtOpenKm);
    else delete payload.meterReadingAtOpenKm;
    mutation.mutate(payload);
  }

  return (
    <AppShell>
      <div className="max-w-2xl">
        <button onClick={() => router.push('/maintenance')} className="text-slate-400 text-sm mb-2">← Back</button>
        <h1 className="page-title mb-6">Create Job Card</h1>
        {err && <div className="mb-4"><ErrorMessage message={err} /></div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="card p-6">
            <h2 className="font-semibold text-navy-800 mb-4">Basic Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="form-label">Asset ID *</label>
                <input required className="form-input font-mono" placeholder="UUID" value={form.assetId} onChange={(e) => set('assetId', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Job Card Type *</label>
                <select required className="form-select" value={form.jobCardType} onChange={(e) => set('jobCardType', e.target.value)}>
                  <option>Corrective</option>
                  <option>Preventive</option>
                </select>
              </div>
              <div>
                <label className="form-label">Workshop Type *</label>
                <select required className="form-select" value={form.workshopType} onChange={(e) => set('workshopType', e.target.value)}>
                  <option>Internal</option>
                  <option>External</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="form-label">Project ID</label>
                <input className="form-input font-mono" placeholder="UUID (if applicable)" value={form.projectId} onChange={(e) => set('projectId', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Corrective fields */}
          {form.jobCardType === 'Corrective' && (
            <div className="card p-6">
              <h2 className="font-semibold text-navy-800 mb-4">Corrective Details — FR-MM-003</h2>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Breakdown Log ID *</label>
                  <input required className="form-input font-mono" placeholder="UUID from the breakdown report" value={form.breakdownLogId} onChange={(e) => set('breakdownLogId', e.target.value)} />
                  <p className="text-xs text-slate-400 mt-1">Corrective job cards must link to a Breakdown Report (FR-MM-003)</p>
                </div>
                <div>
                  <label className="form-label">Fault Category</label>
                  <select className="form-select" value={form.faultCategory} onChange={(e) => set('faultCategory', e.target.value)}>
                    <option value="">Select…</option>
                    {FAULT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Fault Description</label>
                  <textarea rows={3} className="form-input" value={form.faultDescription} onChange={(e) => set('faultDescription', e.target.value)} placeholder="Describe the fault and initial diagnosis…" />
                </div>
              </div>
            </div>
          )}

          {/* Preventive fields */}
          {form.jobCardType === 'Preventive' && (
            <div className="card p-6">
              <h2 className="font-semibold text-navy-800 mb-4">Preventive Details</h2>
              <div>
                <label className="form-label">Service Type</label>
                <select className="form-select" value={form.serviceType} onChange={(e) => set('serviceType', e.target.value)}>
                  <option value="">Select…</option>
                  {SERVICE_TYPES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* External vendor */}
          {form.workshopType === 'External' && (
            <div className="card p-6">
              <h2 className="font-semibold text-navy-800 mb-4">Vendor Details</h2>
              <div>
                <label className="form-label">Vendor ID *</label>
                <input required className="form-input font-mono" placeholder="UUID" value={form.vendorId} onChange={(e) => set('vendorId', e.target.value)} />
              </div>
            </div>
          )}

          <div className="card p-6">
            <h2 className="font-semibold text-navy-800 mb-4">Meter Readings at Open</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Hours Reading</label>
                <input type="number" min="0" className="form-input" value={form.meterReadingAtOpenHours} onChange={(e) => set('meterReadingAtOpenHours', e.target.value)} />
              </div>
              <div>
                <label className="form-label">KM Reading</label>
                <input type="number" min="0" className="form-input" value={form.meterReadingAtOpenKm} onChange={(e) => set('meterReadingAtOpenKm', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Creating…' : 'Create Job Card'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => router.push('/maintenance')}>Cancel</button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
