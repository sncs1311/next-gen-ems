'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { StatusBadge, AssetCode, LoadingSpinner, ErrorMessage } from '@/components/ui';
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

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-slate-400 mb-0.5">{label}</dt>
      <dd className="text-sm font-medium text-navy-800">{value}</dd>
    </div>
  );
}

export default function AssetDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const { data: asset, isLoading, error } = useQuery({
    queryKey: ['asset', id],
    queryFn: async () => { const { data } = await api.get(`/assets/${id}`); return data; },
  });

  if (isLoading) return <AppShell><LoadingSpinner /></AppShell>;
  if (error) return <AppShell><ErrorMessage message={error.message} /></AppShell>;

  const spec = asset?.engineSpecificationAssetId;
  const reg = asset?.gulfRegistrationAssetId;

  return (
    <AppShell>
      <div className="mb-6">
        <button onClick={() => router.push('/assets')} className="text-slate-400 hover:text-slate-600 text-sm mb-3">
          ← Back to Assets
        </button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <AssetCode code={asset.assetNumber} />
              <StatusBadge status={asset.currentStatus} />
            </div>
            <h1 className="text-2xl font-bold text-navy-900">{asset.make} {asset.model}</h1>
            <p className="text-slate-400 text-sm">{asset.subType?.category?.categoryName} — {asset.subType?.subTypeName}</p>
          </div>
          <button className="btn-secondary" onClick={() => router.push(`/assets/${id}/edit`)}>Edit</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Asset Details">
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Year of Manufacture" value={asset.yearOfManufacture} />
            <Field label="Ownership Type" value={asset.ownershipType} />
            <Field label="Color" value={asset.color} />
            <Field label="Current Project" value={asset.currentProject?.projectName} />
          </dl>
        </Section>

        {spec && (
          <Section title="Engine Specification">
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Engine Make/Model" value={`${spec.engineMake} ${spec.engineModel}`} />
              <Field label="Serial Number" value={spec.engineSerialNumber} />
              <Field label="Fuel Type" value={spec.fuelType} />
              <Field label="Horsepower" value={spec.ratedHorsepowerHp && `${spec.ratedHorsepowerHp} HP`} />
              <Field label="Transmission" value={spec.transmissionType} />
              <Field label="Fuel Tank" value={spec.fuelTankCapacityLiters && `${spec.fuelTankCapacityLiters} L`} />
            </dl>
          </Section>
        )}

        {reg && (
          <Section title="Gulf Registration">
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Plate Number" value={reg.plateNumber} />
              <Field label="Country" value={reg.registrationCountry} />
              <Field label="Cert Number" value={reg.registrationCertNumber} />
              <Field label="Expiry" value={reg.registrationExpiryDate && new Date(reg.registrationExpiryDate).toLocaleDateString()} />
            </dl>
          </Section>
        )}

        {/* Certifications */}
        {asset.equipmentCertificationAssetIdList?.length > 0 && (
          <Section title="Equipment Certifications">
            {asset.equipmentCertificationAssetIdList.map((cert) => (
              <div key={cert.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <div className="text-sm font-medium">{cert.certificateNumber}</div>
                  <div className="text-xs text-slate-400">{cert.issuingAuthority} · SWL: {cert.safeWorkingLoad}</div>
                </div>
                <div className="text-sm text-slate-500">{cert.expiryDate && new Date(cert.expiryDate).toLocaleDateString()}</div>
              </div>
            ))}
          </Section>
        )}
      </div>

      {asset.notes && (
        <Section title="Notes">
          <p className="text-sm text-slate-600">{asset.notes}</p>
        </Section>
      )}
    </AppShell>
  );
}
