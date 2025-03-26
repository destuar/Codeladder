import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { AdminProvider } from './features/admin/AdminContext';
import { ProfileProvider } from './features/profile/ProfileContext';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import ProfilePage from './features/profile/ProfilePage';
import DashboardPage from './features/dashboard/DashboardPage';
import CollectionsPage from './features/collections/CollectionsPage';
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
import { QuizHistoryPage } from './features/quiz/QuizHistoryPage';
import CollectionPage from './features/collections/CollectionPage';
import { ReviewPage } from './features/spaced-repetition';

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

// Main layout component with conditional navigation
function MainLayout() {
  const location = useLocation();
  const isProblemPage = location.pathname.match(/^\/problems\/[^/]+$/) || location.pathname.match(/^\/problem\/[^/]+$/);
  const isTopicPage = location.pathname.match(/^\/topics\/[^/]+$/) || location.pathname.match(/^\/topic\/[^/]+$/);
  const isInfoPage = location.pathname.match(/^\/info\/[^/]+$/);
  const isCollectionPage = location.pathname.match(/^\/collection\/[^/]+$/);
  const isQuizPage = location.pathname.match(/^\/quizzes\/[^/]+$/);
  const isQuizResultsPage = location.pathname.match(/^\/quizzes\/attempts\/[^/]+\/results$/);
  
  const shouldHideNavigation = isProblemPage || isInfoPage || isCollectionPage || isQuizPage || isQuizResultsPage;
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      {!shouldHideNavigation && <Navigation />}
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
            path="/review"
            element={
              <ProtectedRoute>
                <AdminViewWrapper>
                  <ReviewPage />
                </AdminViewWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="/problems"
            element={
              <ProtectedRoute>
                <AdminViewWrapper>
                  <CollectionsPage />
                </AdminViewWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="/collections"
            element={
              <ProtectedRoute>
                <AdminViewWrapper>
                  <CollectionsPage />
                </AdminViewWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="/collections/:slug"
            element={
              <ProtectedRoute>
                <AdminViewWrapper>
                  <CollectionsPage />
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
            path="/problem/:slug"
            element={
              <ProtectedRoute>
                <AdminViewWrapper>
                  <ProblemPage />
                </AdminViewWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="/problem/:slug/review"
            element={
              <ProtectedRoute>
                <AdminViewWrapper>
                  <ProblemPage />
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
            path="/topic/:slug"
            element={
              <ProtectedRoute>
                <AdminViewWrapper>
                  <TopicPage />
                </AdminViewWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="/info/:page"
            element={
              <ProtectedRoute>
                <AdminViewWrapper>
                  <InfoPage />
                </AdminViewWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="/levels"
            element={
              <ProtectedRoute>
                <AdminViewWrapper>
                  <LevelSystem />
                </AdminViewWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="/spaced-repetition"
            element={
              <ProtectedRoute>
                <AdminViewWrapper>
                  <ReviewPage />
                </AdminViewWrapper>
              </ProtectedRoute>
            }
          />

          {/* Quiz routes */}
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
          <Route
            path="/quizzes/history/:topicId"
            element={
              <ProtectedRoute>
                <AdminViewWrapper>
                  <QuizHistoryPage />
                </AdminViewWrapper>
              </ProtectedRoute>
            }
          />
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

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/landing" replace />} />
          <Route path="*" element={<Navigate to="/landing" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <AdminProvider>
            <ProfileProvider>
              <MainLayout />
            </ProfileProvider>
          </AdminProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}
