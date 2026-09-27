'use client';
// frontend/src/components/layout/AppShell.jsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from './Sidebar';
import ProjectBadge from './ProjectBadge';

export default function AppShell({ children }) {
  const { isAuthenticated, refreshSession } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // On every page load/refresh, try to silently restore the session
    // using the httpOnly refresh token cookie before deciding to redirect.
    async function check() {
      if (!isAuthenticated) {
        const restored = await refreshSession();
        if (!restored) {
          router.push('/login');
        }
      }
      setChecking(false);
    }
    check();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div>
      <Sidebar />
      <main className="main-content">
        {/* ADDED — persistent way back to Dashboard from any page, so users
            don't have to hunt through the sidebar to get back. Also still
            holds ProjectBadge in the top corner. */}
        <div className="flex justify-between items-center px-4 md:px-6 pt-4">
          <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
            ← Dashboard
          </a>
          <ProjectBadge />
        </div>
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}