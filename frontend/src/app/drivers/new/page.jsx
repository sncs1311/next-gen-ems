'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { ErrorMessage } from '@/components/ui';
import api from '@/lib/api';

const LICENSE_CATEGORIES = [
  'Light Vehicle',
  'Heavy Vehicle',
  'Crane Operator Certificate',
  'Forklift Operator Certificate',
  'Aerial Work Platform Certificate',
];

export default function NewDriverPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    employeeCode: '', fullName: '', nationality: '', jobTitle: 'Driver', email: '', phone: '',
    dateOfBirth: '',
    medicalCertNumber: '', medicalCertExpiry: '',
    licenseNumber: '', licenseCategory: '', issuingAuthority: '', issuingCountry: '', issueDate: '', licenseExpiry: '',
    yearsOfExperience: '', previousEmployer: '',
    emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const mutation = useMutation({
    mutationFn: (d) => api.post('/drivers', d),
    onSuccess: (res) => router.push(`/drivers/${res.data.id}`),
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
    if (!payload.yearsOfExperience) delete payload.yearsOfExperience;
    else payload.yearsOfExperience = Number(payload.yearsOfExperience);
    if (!payload.dateOfBirth) delete payload.dateOfBirth;
    if (!payload.phone) delete payload.phone;
    if (!payload.previousEmployer) delete payload.previousEmployer;
    if (!payload.emergencyContactName) delete payload.emergencyContactName;
    mutation.mutate(payload);
  }

  return (
    <AppShell>
      <div className="max-w-2xl">
        <button onClick={() => router.push('/drivers')} className="text-slate-400 text-sm mb-2">← Back</button>
        <h1 className="page-title mb-1">Register Driver</h1>
        <p className="text-slate-400 text-sm mb-6">Creates Employee identity + Driver record + initial License in one step</p>

        {mutation.error && !Object.keys(fieldErrors).length && (
          <div className="mb-4"><ErrorMessage message={mutation.error.response?.data?.error || 'Registration failed'} /></div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Details */}
          <div className="card p-6">
            <h2 className="font-semibold text-navy-800 mb-4">Personal Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Employee Code *</label>
                <input required className="form-input font-mono" placeholder="EMP-0001" value={form.employeeCode} onChange={(e) => set('employeeCode', e.target.value)} />
                {fieldErrors.employeeCode && <p className="form-error">{fieldErrors.employeeCode}</p>}
              </div>
              <div>
                <label className="form-label">Full Name *</label>
                <input required className="form-input" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Nationality *</label>
                <input required className="form-input" value={form.nationality} onChange={(e) => set('nationality', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Date of Birth</label>
                <input type="date" className="form-input" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Job Title *</label>
                <input required className="form-input" value={form.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Email *</label>
                <input required type="email" className="form-input" value={form.email} onChange={(e) => set('email', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Years of Experience</label>
                <input type="number" min="0" className="form-input" value={form.yearsOfExperience} onChange={(e) => set('yearsOfExperience', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="form-label">Previous Employer</label>
                <input className="form-input" value={form.previousEmployer} onChange={(e) => set('previousEmployer', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Medical Certificate */}
          <div className="card p-6">
            <h2 className="font-semibold text-navy-800 mb-4">Medical Fitness Certificate</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Certificate Number *</label>
                <input required className="form-input" value={form.medicalCertNumber} onChange={(e) => set('medicalCertNumber', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Expiry Date *</label>
                <input required type="date" className="form-input" value={form.medicalCertExpiry} onChange={(e) => set('medicalCertExpiry', e.target.value)} />
              </div>
            </div>
          </div>

          {/* License */}
          <div className="card p-6">
            <h2 className="font-semibold text-navy-800 mb-4">Driving License — FR-DR-002</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">License Number *</label>
                <input required className="form-input font-mono" value={form.licenseNumber} onChange={(e) => set('licenseNumber', e.target.value)} />
              </div>
              <div>
                <label className="form-label">License Category *</label>
                <select required className="form-select" value={form.licenseCategory} onChange={(e) => set('licenseCategory', e.target.value)}>
                  <option value="">Select…</option>
                  {LICENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Issuing Authority *</label>
                <input required className="form-input" value={form.issuingAuthority} onChange={(e) => set('issuingAuthority', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Issuing Country *</label>
                <input required className="form-input" placeholder="e.g. Qatar" value={form.issuingCountry} onChange={(e) => set('issuingCountry', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Issue Date *</label>
                <input required type="date" className="form-input" value={form.issueDate} onChange={(e) => set('issueDate', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Expiry Date *</label>
                <input required type="date" className="form-input" value={form.licenseExpiry} onChange={(e) => set('licenseExpiry', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="card p-6">
            <h2 className="font-semibold text-navy-800 mb-4">Emergency Contact</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="form-label">Name</label>
                <input className="form-input" value={form.emergencyContactName} onChange={(e) => set('emergencyContactName', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.emergencyContactPhone} onChange={(e) => set('emergencyContactPhone', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Relation</label>
                <input className="form-input" placeholder="e.g. Spouse" value={form.emergencyContactRelation} onChange={(e) => set('emergencyContactRelation', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Registering…' : 'Register Driver'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => router.push('/drivers')}>Cancel</button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
