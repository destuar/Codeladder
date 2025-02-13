import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { AdminProvider } from './features/admin/AdminContext';
import { ProfileProvider } from './features/profile/ProfileContext';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import ProfilePage from './features/profile/ProfilePage';
import DashboardPage from './features/dashboard/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import { Navigation } from './components/Navigation';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { useAdmin } from './features/admin/AdminContext';
import { LevelSystem } from "@/features/learning/components/LevelSystem";
import { Navbar } from "@/components/Navbar";
import OAuthCallback from './features/auth/OAuthCallback';
import TopicPage from './features/topics/TopicPage';
import ProblemPage from './features/problems/ProblemPage';
import { InfoPage } from '@/features/info/InfoPage';

// Regular components
const UnauthorizedPage = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-xl text-destructive">
      You are not authorized to access this page.
    </div>
  </div>
);

// Admin view wrapper component
function AdminViewWrapper({ children }: { children: React.ReactNode }) {
  const { isAdminView, canAccessAdmin } = useAdmin();
  
  if (isAdminView && canAccessAdmin) {
    return <AdminDashboard />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AdminProvider>
          <ProfileProvider>
            <div className="min-h-screen bg-background text-foreground">
              <Navigation />
              <main>
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/unauthorized" element={<UnauthorizedPage />} />
                  <Route path="/auth/callback/:provider" element={<OAuthCallback />} />

                  {/* Protected routes */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <AdminViewWrapper>
                          <DashboardPage />
                        </AdminViewWrapper>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <AdminViewWrapper>
                          <ProfilePage />
                        </AdminViewWrapper>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/topics/:topicId"
                    element={
                      <ProtectedRoute>
                        <AdminViewWrapper>
                          <TopicPage />
                        </AdminViewWrapper>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/problems/:problemId"
                    element={
                      <ProtectedRoute>
                        <AdminViewWrapper>
                          <ProblemPage />
                        </AdminViewWrapper>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/info/:id"
                    element={
                      <ProtectedRoute>
                        <InfoPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Redirect root to dashboard */}
                  <Route
                    path="/"
                    element={<Navigate to="/dashboard" replace />}
                  />

                  {/* Catch all other routes */}
                  <Route
                    path="*"
                    element={<Navigate to="/dashboard" replace />}
                  />
                </Routes>
              </main>
            </div>
          </ProfileProvider>
        </AdminProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
