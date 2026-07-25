'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { RiskBadge, AssetCode, LoadingSpinner, ErrorMessage } from '@/components/ui';
import api from '@/lib/api';

function Section({ title, children }) {
  return (
    <div className="card mb-4">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 rounded-t-lg">
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, value, mono }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-slate-400 mb-0.5">{label}</dt>
      <dd className={`text-sm font-medium text-navy-800 ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}

export default function DriverDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const { data: driver, isLoading, error } = useQuery({
    queryKey: ['driver', id],
    queryFn: async () => { const { data } = await api.get(`/drivers/${id}`); return data; },
  });

  if (isLoading) return <AppShell><LoadingSpinner /></AppShell>;
  if (error) return <AppShell><ErrorMessage message={error.message} /></AppShell>;

  const currentLicense = driver?.driverLicenseDriverIdList?.[0];
  const score = driver?.driverBehaviorScoreDriverId;
  const expired = currentLicense?.expiryDate && new Date(currentLicense.expiryDate) < new Date();

  return (
    <AppShell>
      <div className="mb-6">
        <button onClick={() => router.push('/drivers')} className="text-slate-400 text-sm mb-3">← Back to Drivers</button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <AssetCode code={driver.employee?.employeeCode} />
              {score && <RiskBadge risk={score.riskCategory} />}
            </div>
            <h1 className="text-2xl font-bold text-navy-900">{driver.employee?.fullName}</h1>
            <p className="text-slate-400 text-sm">{driver.employee?.jobTitle} · {driver.employee?.nationality}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Personal Details">
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Email" value={driver.employee?.email} />
            <Field label="Phone" value={driver.employee?.phone} />
            <Field label="Years of Experience" value={driver.yearsOfExperience} />
            <Field label="Previous Employer" value={driver.previousEmployer} />
          </dl>
        </Section>

        <Section title="Medical Fitness">
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Certificate Number" value={driver.medicalCertNumber} mono />
            <Field label="Expiry" value={driver.medicalCertExpiry && new Date(driver.medicalCertExpiry).toLocaleDateString()} />
          </dl>
        </Section>

        <Section title="Current License">
          {!currentLicense ? <p className="text-slate-400 text-sm">No license on record</p> : (
            <dl className="grid grid-cols-2 gap-4">
              <Field label="License Number" value={currentLicense.licenseNumber} mono />
              <Field label="Category" value={currentLicense.licenseCategory} />
              <Field label="Issuing Authority" value={currentLicense.issuingAuthority} />
              <Field label="Country" value={currentLicense.issuingCountry} />
              <Field label="Issue Date" value={new Date(currentLicense.issueDate).toLocaleDateString()} />
              <div>
                <dt className="text-xs text-slate-400 mb-0.5">Expiry Date</dt>
                <dd className={`text-sm font-medium ${expired ? 'text-red-500' : 'text-navy-800'}`}>
                  {new Date(currentLicense.expiryDate).toLocaleDateString()}{expired ? ' — EXPIRED ⚠' : ''}
                </dd>
              </div>
            </dl>
          )}
        </Section>

        {score && (
          <Section title="Behavior Score — FR-DR-004">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 rounded-lg bg-slate-50">
                <div className="text-3xl font-bold text-navy-900">{Number(score.compositeScore).toFixed(0)}</div>
                <div className="text-xs text-slate-400 mt-1">Composite Score</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-slate-50">
                <RiskBadge risk={score.riskCategory} />
                <div className="text-xs text-slate-400 mt-2">Risk Category</div>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Incident Score (40%)" value={`${Number(score.incidentScore).toFixed(0)} / 100`} />
              <Field label="Fuel Score (30%)" value={`${Number(score.fuelScore).toFixed(0)} / 100`} />
              <Field label="Breakdown Score (20%)" value={`${Number(score.breakdownAttributionScore).toFixed(0)} / 100`} />
              <Field label="Compliance Score (10%)" value={`${Number(score.complianceScore).toFixed(0)} / 100`} />
            </dl>
          </Section>
        )}
      </div>

      {/* Training records */}
      {driver.driverTrainingRecordDriverIdList?.length > 0 && (
        <Section title="Training Records">
          <table className="table-base">
            <thead><tr><th>Type</th><th>Provider</th><th>Date</th><th>Expiry</th></tr></thead>
            <tbody>
              {driver.driverTrainingRecordDriverIdList.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">{t.trainingType}</td>
                  <td className="text-slate-500">{t.trainingProvider ?? '—'}</td>
                  <td className="text-slate-500">{new Date(t.trainingDate).toLocaleDateString()}</td>
                  <td className="text-slate-500">{t.expiryDate ? new Date(t.expiryDate).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </AppShell>
  );
}
