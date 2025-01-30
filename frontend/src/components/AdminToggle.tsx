import { useAdmin } from '@/features/admin/AdminContext';

export function AdminToggle() {
  const { isAdminView, setIsAdminView, canAccessAdmin } = useAdmin();

  if (!canAccessAdmin) return null;

  return (
    <button onClick={() => setIsAdminView(!isAdminView)}>
      {isAdminView ? 'Exit Admin' : 'Admin View'}
    </button>
  );
} 