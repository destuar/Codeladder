import { Switch } from './ui/switch';
import { useAdmin } from '@/features/admin/AdminContext';
import { Label } from './ui/label';

export function AdminToggle() {
  const { isAdminView, toggleAdminView, canAccessAdmin } = useAdmin();

  if (!canAccessAdmin) return null;

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="admin-mode"
        checked={isAdminView}
        onCheckedChange={toggleAdminView}
      />
      <Label htmlFor="admin-mode" className="text-sm font-medium">
        Admin Mode
      </Label>
    </div>
  );
} 