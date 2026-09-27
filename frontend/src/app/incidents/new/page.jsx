'use client';
import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { ErrorMessage } from '@/components/ui';
import AssetLookup from '@/components/ui/AssetLookup';
import EntityPicker from '@/components/ui/EntityPicker';
import api from '@/lib/api';

const INCIDENT_TYPES = [
  'Near Miss', 'Minor Accident', 'Major Accident', 'Fire',
  'Equipment Tip-Over', 'Falling Object', 'Third-Party Property Damage', 'Personal Injury',
];
const THIRD_PARTY_TYPES = new Set(['Minor Accident', 'Major Accident', 'Third-Party Property Damage']);

function SectionTitle({ children }) {
  return <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mt-6 mb-3 pb-1 border-b border-gray-100">{children}</h3>;
}
function Field({ label, required, children }) {
  return (
    <div>
      <label className="form-label">{label}{required && ' *'}</label>
      {children}
    </div>
  );
}

export default function NewIncidentPage() {
  const router = useRouter();
  const photoInputRef = useRef(null);
  const docInputRef = useRef(null);

  const [form, setForm] = useState({
    assetId: '', driverId: '', projectId: '',
    incidentType: '', occurredAt: '',
    thirdPartyInvolved: false,
    thirdPartyVehiclePlate: '', thirdPartyCompany: '', thirdPartyDriverName: '', thirdPartyInsuranceDetails: '',
    personalInjuryOccurred: false,
    injuredPersonsDetails: '', medicalAttentionRequired: false, hospitalizationOccurred: false, medicalFacility: '',
    policeReportNumber: '', estimatedDamageCost: '',
  });
  const [photos, setPhotos] = useState([]);
  const [docs, setDocs] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [err, setErr] = useState('');

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function addPhotos(files) {
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    setPhotos((p) => [...p, ...arr]);
    arr.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreviews((p) => [...p, { name: f.name, url: e.target.result }]);
      reader.readAsDataURL(f);
    });
  }
  function addDocs(files) { setDocs((d) => [...d, ...Array.from(files)]); }

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        estimatedDamageCost: form.estimatedDamageCost ? Number(form.estimatedDamageCost) : undefined,
        driverId: form.driverId || undefined,
        projectId: form.projectId || undefined,
      };
      const { data: incident } = await api.post('/incidents', payload);
      if (photos.length > 0 || docs.length > 0) {
        const formData = new FormData();
        [...photos, ...docs].forEach((f) => formData.append('files', f));
        await api.post(`/incidents/${incident.id}/media`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      return incident;
    },
    onSuccess: (incident) => router.push(`/incidents/${incident.id}`),
    onError: (e) => setErr(e.response?.data?.error || e.response?.data?.errors?.[0]?.message || 'Failed to file incident report'),
  });

  const showThirdParty = THIRD_PARTY_TYPES.has(form.incidentType) || form.thirdPartyInvolved;

  return (
    <AppShell>
      <div className="max-w-2xl">
        <button onClick={() => router.push('/incidents')} className="text-slate-400 text-sm mb-3">← Back</button>
        <h1 className="page-title mb-1">File Incident Report</h1>
        <p className="text-slate-400 text-sm mb-6">All fields marked * are required to submit.</p>
        {err && <div className="mb-4"><ErrorMessage message={err} /></div>}

        <div className="card p-6 space-y-4">
          <SectionTitle>Incident Details</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Asset" required>
              <AssetLookup value={form.assetId} onChange={(id) => set('assetId', id)} required />
            </Field>
            <Field label="Incident Type" required>
              <select required className="form-select" value={form.incidentType} onChange={(e) => set('incidentType', e.target.value)}>
                <option value="">Select type…</option>
                {INCIDENT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          {/* FIXED: driverId and projectId were raw UUID text inputs —
              replaced with EntityPicker so users search by name/code. */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Driver / Operator">
              <EntityPicker
                endpoint="/drivers"
                labelFn={(d) => d.employee?.fullName ?? d.id}
                value={form.driverId}
                onChange={(id) => set('driverId', id)}
                placeholder="Search by name…"
              />
            </Field>
            <Field label="Project Site">
              <EntityPicker
                endpoint="/projects"
                labelFn={(p) => `${p.projectCode} — ${p.projectName}`}
                value={form.projectId}
                onChange={(id) => set('projectId', id)}
                placeholder="Search by project code…"
              />
            </Field>
          </div>

          <Field label="Date & Time of Incident" required>
            <input required type="datetime-local" className="form-input" value={form.occurredAt} onChange={(e) => set('occurredAt', e.target.value)} />
          </Field>
          <Field label="Estimated Damage Cost (SAR)">
            <input type="number" min="0" className="form-input" value={form.estimatedDamageCost} onChange={(e) => set('estimatedDamageCost', e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Police Report Number">
            <input className="form-input" value={form.policeReportNumber} onChange={(e) => set('policeReportNumber', e.target.value)} placeholder="Only if a police report was filed" />
          </Field>

          <SectionTitle>Third-Party Involvement</SectionTitle>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.thirdPartyInvolved} onChange={(e) => set('thirdPartyInvolved', e.target.checked)} className="w-4 h-4" />
            <span className="text-sm">Third party was involved</span>
          </label>
          {showThirdParty && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Third-Party Vehicle Plate">
                <input className="form-input" value={form.thirdPartyVehiclePlate} onChange={(e) => set('thirdPartyVehiclePlate', e.target.value)} />
              </Field>
              <Field label="Third-Party Company">
                <input className="form-input" value={form.thirdPartyCompany} onChange={(e) => set('thirdPartyCompany', e.target.value)} />
              </Field>
              <Field label="Third-Party Driver Name">
                <input className="form-input" value={form.thirdPartyDriverName} onChange={(e) => set('thirdPartyDriverName', e.target.value)} />
              </Field>
              <Field label="Insurance Details">
                <input className="form-input" value={form.thirdPartyInsuranceDetails} onChange={(e) => set('thirdPartyInsuranceDetails', e.target.value)} />
              </Field>
            </div>
          )}

          <SectionTitle>Injuries</SectionTitle>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.personalInjuryOccurred} onChange={(e) => set('personalInjuryOccurred', e.target.checked)} className="w-4 h-4" />
            <span className="text-sm">Personal injury occurred</span>
          </label>
          {form.personalInjuryOccurred && (
            <div className="space-y-3">
              <Field label="Injured Persons Details">
                <textarea rows={2} className="form-input" value={form.injuredPersonsDetails} onChange={(e) => set('injuredPersonsDetails', e.target.value)} />
              </Field>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={form.medicalAttentionRequired} onChange={(e) => set('medicalAttentionRequired', e.target.checked)} className="w-4 h-4" />
                  Medical attention required
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={form.hospitalizationOccurred} onChange={(e) => set('hospitalizationOccurred', e.target.checked)} className="w-4 h-4" />
                  Hospitalization
                </label>
              </div>
              {form.medicalAttentionRequired && (
                <Field label="Medical Facility">
                  <input className="form-input" value={form.medicalFacility} onChange={(e) => set('medicalFacility', e.target.value)} />
                </Field>
              )}
            </div>
          )}

          <SectionTitle>Photos</SectionTitle>
          <div
            className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
            onClick={() => photoInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addPhotos(e.dataTransfer.files); }}
          >
            <p className="text-sm text-gray-400">Drag photos here or <span className="underline">browse</span></p>
            <p className="text-xs text-gray-300 mt-1">JPG, PNG, WEBP — max 10 MB each</p>
            <input ref={photoInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => addPhotos(e.target.files)} />
          </div>
          {photoPreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {photoPreviews.map((p, i) => (
                <div key={i} className="relative">
                  <img src={p.url} alt={p.name} className="w-20 h-20 object-cover rounded border border-gray-200" />
                  <button type="button"
                    onClick={() => { setPhotos((a) => a.filter((_, j) => j !== i)); setPhotoPreviews((a) => a.filter((_, j) => j !== i)); }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">×</button>
                </div>
              ))}
            </div>
          )}

          <SectionTitle>Documents</SectionTitle>
          <div
            className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
            onClick={() => docInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addDocs(e.dataTransfer.files); }}
          >
            <p className="text-sm text-gray-400">Drag documents here or <span className="underline">browse</span></p>
            <p className="text-xs text-gray-300 mt-1">PDF, Word — max 10 MB each</p>
            <input ref={docInputRef} type="file" multiple accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(e) => addDocs(e.target.files)} />
          </div>
          {docs.length > 0 && (
            <ul className="space-y-1 mt-2">
              {docs.map((f, i) => (
                <li key={i} className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded">
                  <span className="text-gray-700">{f.name}</span>
                  <button type="button" onClick={() => setDocs((a) => a.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">Remove</button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-3 pt-4">
            <button
              className="btn-danger"
              disabled={submitMutation.isPending || !form.assetId || !form.incidentType || !form.occurredAt}
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? 'Submitting…' : 'Submit Incident Report'}
            </button>
            <button className="btn-secondary" onClick={() => router.push('/incidents')}>Cancel</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}