'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  useEffect(() => {
    router.push(isAuthenticated ? '/dashboard' : '/login');
  }, [isAuthenticated, router]);
  return null;
}
