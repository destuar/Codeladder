import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { AdminProvider } from './features/admin/AdminContext';
import { ProfileProvider } from './features/profile/ProfileContext';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import ProfilePage from './features/profile/ProfilePage';
import DashboardPage from './features/dashboard/DashboardPage';
import ProblemsPage from './features/problems/ProblemsPage';
import ProtectedRoute from './components/ProtectedRoute';
import { Navigation } from './components/Navigation';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { useAdmin } from './features/admin/AdminContext';
import { LevelSystem } from "@/components/LevelSystem";
import { Navbar } from "@/components/Navbar";
import OAuthCallback from './features/auth/OAuthCallback';
import TopicPage from './features/topics/TopicPage';
import ProblemPage from './features/problems/ProblemPage';
import { InfoPage } from '@/features/info/InfoPage';
import { QueryClientProvider } from '@tanstack/react-query';
import queryClient from '@/lib/queryClient';
import { LandingPage } from './features/landingpage';
// Import quiz feature components
import { QuizPage } from './features/quiz/QuizPage';
import { QuizResultsPage } from './features/quiz/QuizResultsPage';

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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <AdminProvider>
            <ProfileProvider>
              <div className="min-h-screen bg-background text-foreground">
                <Navigation />
                <main>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/landing" element={<AdminViewWrapper><LandingPage /></AdminViewWrapper>} />
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
                      path="/problems"
                      element={
                        <ProtectedRoute>
                          <AdminViewWrapper>
                            <ProblemsPage />
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
                          <AdminViewWrapper>
                            <InfoPage />
                          </AdminViewWrapper>
                        </ProtectedRoute>
                      }
                    />

                    {/* Quiz routes */}
                    <Route
                      path="/quizzes/:quizId"
                      element={
                        <ProtectedRoute>
                          <AdminViewWrapper>
                            <QuizPage />
                          </AdminViewWrapper>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/quizzes/attempts/:attemptId/results"
                      element={
                        <ProtectedRoute>
                          <AdminViewWrapper>
                            <QuizResultsPage />
                          </AdminViewWrapper>
                        </ProtectedRoute>
                      }
                    />

                    {/* Redirect root to landing page */}
                    <Route
                      path="/"
                      element={<Navigate to="/landing" replace />}
                    />

                    {/* Catch all other routes */}
                    <Route
                      path="*"
                      element={<Navigate to="/landing" replace />}
                    />
                  </Routes>
                </main>
              </div>
            </ProfileProvider>
          </AdminProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}
