import { useEffect, useState, useRef } from 'react';
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
import { LevelSystem } from '@/components/LevelSystem';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LearningPathAdmin } from "./components/LearningPathAdmin";
import { StandaloneInfoAdmin } from "./components/StandaloneInfoAdmin";
import { ContentMigrationTool } from "./components/ContentMigrationTool";
// import { ProblemListAdmin } from "./components/ProblemListAdmin";
import { ProblemCollectionAdmin, ProblemCollectionAdminRef } from './components/ProblemCollectionAdmin';
import { QuizAdmin } from "./components/QuizAdmin";
import { TestAdmin } from "./components/TestAdmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingCard } from '@/components/ui/loading-spinner';
import { PlusCircle } from 'lucide-react';

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
  const problemCollectionAdminRef = useRef<ProblemCollectionAdminRef>(null);

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

  const ErrorView = () => (
    <div className="p-8 text-center">
      <div className="text-destructive mb-2">Error: {error}</div>
      <Button variant="outline" onClick={() => window.location.reload()}>
        Retry
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading Admin Dashboard</CardTitle>
            <CardDescription>Please wait...</CardDescription>
          </CardHeader>
          <CardContent>
            <LoadingCard />
          </CardContent>
        </Card>
      </div>
    );
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
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
              >
                Refresh
              </Button>
            </div>

            <div className="grid gap-8">
              <div>
                <h2 className="text-2xl font-bold mb-4">User Management</h2>
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
              </div>

              <LevelSystem />
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
    <div className="container py-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage your learning platform content and view user progress
          </p>
        </div>

        <Tabs defaultValue="editor" className="space-y-4">
          <TabsList>
            <TabsTrigger value="editor">Learning Path Editor</TabsTrigger>
            <TabsTrigger value="problem-collection-editor">Problem List Editor</TabsTrigger>
            <TabsTrigger value="quiz-editor">Quiz Editor</TabsTrigger>
            <TabsTrigger value="test-editor">Test Editor</TabsTrigger>
            <TabsTrigger value="info">Standalone Info Pages</TabsTrigger>
            <TabsTrigger value="tools">Content Tools</TabsTrigger>
            {/* <TabsTrigger value="preview">User View Preview</TabsTrigger> */}
          </TabsList>

          <TabsContent value="editor" className="space-y-4">
            <LearningPathAdmin />
          </TabsContent>

          <TabsContent value="problem-collection-editor" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-3xl font-bold">Problem Collection Management</h2>
                <p className="text-muted-foreground mt-1">
                  View all problems or filter by collection. Add new problems (not tied to a specific topic) here.
                </p>
              </div>
              <Button onClick={() => problemCollectionAdminRef.current?.openAddCollectionDialog()}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New Collection
              </Button>
            </div>
            <ProblemCollectionAdmin ref={problemCollectionAdminRef} />
          </TabsContent>

          <TabsContent value="quiz-editor" className="space-y-4">
            <QuizAdmin />
          </TabsContent>

          <TabsContent value="test-editor" className="space-y-4">
            <TestAdmin />
          </TabsContent>

          <TabsContent value="info" className="space-y-4">
            <StandaloneInfoAdmin />
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            <ContentMigrationTool />
          </TabsContent>

          {/* Preview tab already commented out */}
        </Tabs>
      </div>
    </div>
  );
} 