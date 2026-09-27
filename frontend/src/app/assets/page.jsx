'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { LoadingSpinner, ErrorMessage } from '@/components/ui';
import CategoryCard from '@/components/ui/CategoryCard';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

const CAN_CREATE = ['FLEET_MGR', 'SYS_ADMIN'];

export default function AssetCategoriesPage() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['asset-categories'],
    queryFn: async () => { const { data } = await api.get('/assets/categories'); return data; },
  });

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">Assets</h1>
        {CAN_CREATE.includes(user?.role) && (
          <button className="btn-primary" onClick={() => router.push('/assets/new')}>+ Register Asset</button>
        )}
      </div>

      {isLoading ? <LoadingSpinner /> : error ? <ErrorMessage message={error.message} /> : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              title={cat.categoryName}
              sub={`${cat.assetCount} asset${cat.assetCount !== 1 ? 's' : ''}`}
              onClick={() => router.push(`/assets/category/${cat.id}`)}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}