'use client';
// frontend/src/components/layout/ProjectBadge.jsx
//
// Top-corner project indicator. Reads user.primaryProject directly from
// AuthContext — no extra API call needed, since login() already returns the
// full Project row (see auth.service.js). Clicking opens a details popup.
// For global roles (SYS_ADMIN, EXEC), primaryProject is null and this shows
// an "All Sites" badge instead — non-clickable, since there's no single
// project to drill into.

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Modal from '@/components/ui/Modal';

function DetailRow({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-gray-900 text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export default function ProjectBadge() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  if (!user.primaryProject) {
    // Global role (SYS_ADMIN, EXEC) or not yet assigned a project.
    return (
      <span className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 font-medium">
        All Sites
      </span>
    );
  }

  const p = user.primaryProject;
  const multiSite = user.projects && user.projects.length > 1;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
        {p.projectCode}
        {multiSite && <span className="text-gray-400">+{user.projects.length - 1}</span>}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={p.projectName}>
        <div className="space-y-1">
          <DetailRow label="Project Code" value={p.projectCode} />
          <DetailRow label="Client" value={p.clientName} />
          <DetailRow label="Sector" value={p.sector} />
          <DetailRow label="Location" value={`${p.city}, ${p.country}`} />
          <DetailRow label="Status" value={p.projectStatus} />
          <DetailRow label="Start Date" value={p.startDate ? new Date(p.startDate).toLocaleDateString() : null} />
          <DetailRow label="Planned Completion" value={p.plannedCompletionDate ? new Date(p.plannedCompletionDate).toLocaleDateString() : null} />
        </div>

        {multiSite && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Also assigned to</p>
            <div className="flex flex-wrap gap-2">
              {user.projects.filter((proj) => proj.id !== p.id).map((proj) => (
                <span key={proj.id} className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                  {proj.projectCode}
                </span>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}