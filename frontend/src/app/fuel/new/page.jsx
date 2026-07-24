'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { ErrorMessage } from '@/components/ui';
import api from '@/lib/api';

export default function NewFuelLogPage() {
  const router = useRouter();
  const [form, setForm] = useState({ assetId: '', driverId: '', projectId: '', fuelType: 'Diesel', quantityLiters: '', fuelSource: 'Site Tank', voucherReference: '', meterReadingKm: '', meterReadingHours: '', unitPrice: '' });
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);

  const mutation = useMutation({
    mutationFn: (d) => api.post('/fuel/logs', d),
    onSuccess: (res) => setResult(res.data),
    onError: (e) => setErr(e.response?.data?.error || 'Log entry failed'),
  });

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  if (result) {
    return (
      <AppShell>
        <div className="max-w-lg">
          <div className="card p-6 text-center">
            <div className="text-4xl mb-3">✓</div>
            <h2 className="text-lg font-semibold mb-1">Fuel Log Recorded</h2>
            <p className="text-slate-400 text-sm mb-4">
              {result.fuelLog.quantityLiters} L logged
              {result.fuelLog.calculatedEfficiency ? ` · Efficiency: ${Number(result.fuelLog.calculatedEfficiency).toFixed(2)}` : ''}
            </p>
            {result.anomaly && (
              <div className="mb-4 px-4 py-3 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                ⚠ Fuel anomaly detected ({result.anomaly.anomalyType}) — Fleet Manager has been alerted.
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button className="btn-primary" onClick={() => { setResult(null); setForm({ ...form, quantityLiters: '', voucherReference: '', meterReadingKm: '', meterReadingHours: '' }); }}>Log Another</button>
              <button className="btn-secondary" onClick={() => router.push('/fuel')}>Done</button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-xl">
        <button onClick={() => router.push('/fuel')} className="text-slate-400 text-sm mb-3">← Back</button>
        <h1 className="page-title mb-6">Log Fuel Transaction</h1>
        {err && <div className="mb-4"><ErrorMessage message={err} /></div>}
        <div className="card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Asset ID *</label>
              <input required className="form-input" placeholder="UUID" value={form.assetId} onChange={(e) => set('assetId', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Driver ID *</label>
              <input required className="form-input" placeholder="UUID" value={form.driverId} onChange={(e) => set('driverId', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="form-label">Project ID *</label>
            <input required className="form-input" placeholder="UUID" value={form.projectId} onChange={(e) => set('projectId', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Fuel Type *</label>
              <select className="form-select" value={form.fuelType} onChange={(e) => set('fuelType', e.target.value)}>
                <option>Diesel</option><option>Petrol</option><option>LPG</option>
              </select>
            </div>
            <div>
              <label className="form-label">Fuel Source *</label>
              <select className="form-select" value={form.fuelSource} onChange={(e) => set('fuelSource', e.target.value)}>
                <option>Site Tank</option><option>Fuel Bowser</option><option>Petrol Station</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Quantity (Litres) *</label>
              <input required type="number" min="0.1" step="0.1" className="form-input" value={form.quantityLiters} onChange={(e) => set('quantityLiters', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Unit Price</label>
              <input type="number" min="0" step="0.001" className="form-input" value={form.unitPrice} onChange={(e) => set('unitPrice', e.target.value)} placeholder="per litre" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Meter Reading (km)</label>
              <input type="number" className="form-input" value={form.meterReadingKm} onChange={(e) => set('meterReadingKm', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Meter Reading (hours)</label>
              <input type="number" className="form-input" value={form.meterReadingHours} onChange={(e) => set('meterReadingHours', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="form-label">Voucher / Reference</label>
            <input className="form-input" value={form.voucherReference} onChange={(e) => set('voucherReference', e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-primary" disabled={mutation.isPending} onClick={() => {
              const payload = { ...form, quantityLiters: Number(form.quantityLiters) };
              if (!payload.meterReadingKm) delete payload.meterReadingKm;
              else payload.meterReadingKm = Number(payload.meterReadingKm);
              if (!payload.meterReadingHours) delete payload.meterReadingHours;
              else payload.meterReadingHours = Number(payload.meterReadingHours);
              if (!payload.unitPrice) delete payload.unitPrice;
              else payload.unitPrice = Number(payload.unitPrice);
              mutation.mutate(payload);
            }}>
              {mutation.isPending ? 'Saving…' : 'Save Fuel Log'}
            </button>
            <button className="btn-secondary" onClick={() => router.push('/fuel')}>Cancel</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
