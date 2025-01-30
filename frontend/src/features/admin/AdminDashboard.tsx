import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAdmin } from './AdminContext';
import { useAuth } from '../auth/AuthContext';
import { api } from '@/lib/api';
import { User } from '@/types/user';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AdminData {
  users: User[];
  profile?: any; // Add more specific types as needed
}

export function AdminDashboard() {
  const location = useLocation();
  const { isAdminView, canAccessAdmin } = useAdmin();
  const { token } = useAuth();
  const [data, setData] = useState<AdminData>({ users: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!canAccessAdmin || !token) return;
      
      setIsLoading(true);
      setError(null);

      try {
        switch (location.pathname) {
          case '/dashboard':
            const users = await api.get('/admin/users', token);
            setData(prev => ({ ...prev, users }));
            break;
          case '/profile':
            // Add profile-specific data fetching if needed
            // const profileData = await api.get('/admin/profile', token);
            // setData(prev => ({ ...prev, profile: profileData }));
            break;
          default:
            break;
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    if (isAdminView) {
      fetchData();
    }
  }, [isAdminView, canAccessAdmin, token, location.pathname]);

  if (!isAdminView || !canAccessAdmin) {
    return null;
  }

  const LoadingView = () => (
    <div className="flex items-center justify-center p-8">
      <div className="space-y-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Loading admin view...</p>
      </div>
    </div>
  );

  const ErrorView = () => (
    <div className="p-8 text-center">
      <div className="text-destructive mb-2">Error: {error}</div>
      <Button variant="outline" onClick={() => window.location.reload()}>
        Retry
      </Button>
    </div>
  );

  if (isLoading) {
    return <LoadingView />;
  }

  if (error) {
    return <ErrorView />;
  }

  // Show different content based on the current route
  const renderContent = () => {
    switch (location.pathname) {
      case '/dashboard':
        return (
          <>
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">User Management</h1>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
              >
                Refresh
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                          <Button variant="destructive" size="sm">
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        );

      case '/profile':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold">Admin Profile Settings</h1>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
              >
                Refresh
              </Button>
            </div>
            <div className="rounded-md border p-6">
              <h2 className="text-xl font-semibold mb-4">Advanced Settings</h2>
              {/* Add admin-specific profile settings here */}
              <div className="text-muted-foreground">
                Advanced admin settings will be available here.
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-8">
            <h1 className="text-3xl font-bold">Admin View</h1>
            <p className="text-muted-foreground mt-2">Select a section from the navigation.</p>
          </div>
        );
    }
  };

  return (
    <div className="container py-8 space-y-8">
      {renderContent()}
    </div>
  );
} 