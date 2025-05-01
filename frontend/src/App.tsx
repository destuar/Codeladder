import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
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
import { QuizPage } from './features/assesment/quiz/QuizPage';
import { QuizResultsPage } from './features/assesment/quiz/QuizResultsPage';
import { QuizHistoryPage } from './features/assesment/quiz/QuizHistoryPage';
import { ReviewPage } from './features/spaced-repetition';
import { AssessmentEntryPage } from './features/assesment/shared/AssessmentEntryPage';
import { TestResultsPage } from './features/assesment/test/TestResultsPage';
import { TestHistoryPage } from './features/assesment/test/TestHistoryPage';
import { TestPage } from './features/assesment/test/TestPage';
import { AssessmentResultsRouter } from './features/assesment/shared/AssessmentResultsRouter';
import { Spotlight } from '@/components/ui/spotlight-new';

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
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark') || 
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
    };
    
    checkDarkMode();
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          checkDarkMode();
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    
    return () => observer.disconnect();
  }, []);

  const isProblemPage = location.pathname.match(/^\/problems\/[^/]+$/) || location.pathname.match(/^\/problem\/[^/]+$/);
  const isProblemReviewPage = location.pathname.match(/^\/problem\/[^/]+\/review$/);
  const isTopicPage = location.pathname.match(/^\/topics\/[^/]+$/) || location.pathname.match(/^\/topic\/[^/]+$/);
  const isInfoPage = location.pathname.match(/^\/info\/[^/]+$/);
  const isCollectionPage = false;
  const isQuizPage = location.pathname.match(/^\/quizzes\/[^/]+\/take$/) || 
                    location.pathname.match(/^\/quizzes\/attempts\/[^/]+\/results$/) || 
                    location.pathname.match(/^\/quizzes\/[^/]+$/);
  const isTestPage = location.pathname.match(/^\/tests\/[^/]+\/take$/) ||
                    location.pathname.match(/^\/tests\/attempts\/[^/]+\/results$/) ||
                    location.pathname.match(/^\/tests\/[^/]+$/);
  const isAssessmentPage = location.pathname.match(/^\/assessment\/[^/]+\/[^/]+$/);
                  
  const shouldHideNavigation = isProblemPage || isInfoPage || isCollectionPage || isQuizPage || isTestPage || isAssessmentPage || isProblemReviewPage;
  
  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {/* Background pattern: Placed here, z-0 */}
      <div className="absolute inset-0 z-0 bg-dot-[#5b5bf7]/[0.2] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      
      {/* Spotlight Wrapper: Placed behind Nav/Content */}
      <div className="absolute inset-0 -z-10 overflow-hidden"> 
        {isDarkMode ? (
          <Spotlight
            gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(240, 100%, 85%, .08) 0, hsla(240, 100%, 55%, .02) 50%, hsla(240, 100%, 45%, 0) 80%)"
            gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(240, 100%, 85%, .06) 0, hsla(240, 100%, 55%, .02) 80%, transparent 100%)"
            gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(240, 100%, 85%, .04) 0, hsla(240, 100%, 45%, .02) 80%, transparent 100%)"
            translateY={-300}
            width={600}
            height={1200}
            duration={10}
          />
        ) : (
          <Spotlight
            gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(240, 100%, 85%, .02) 0, hsla(240, 100%, 55%, .005) 50%, hsla(240, 100%, 45%, 0) 80%)"
            gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(240, 100%, 85%, .015) 0, hsla(240, 100%, 55%, .005) 80%, transparent 100%)"
            gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(240, 100%, 85%, .01) 0, hsla(240, 100%, 45%, .005) 80%, transparent 100%)"
            translateY={-300}
            width={600}
            height={1200}
            duration={10}
          />
        )}
      </div>

      {/* Ensure Navbar is above background and spotlight: z-30 */}
      {!shouldHideNavigation && (
        <div className="relative z-30">
          <Navigation />
        </div>
      )}
      {/* Ensure main content is above background and spotlight: z-20 */}
      <main className={`relative z-20 pb-8 ${!shouldHideNavigation ? "pt-16" : ""}`}>
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
            path="/quizzes/:quizId/take"
            element={
              <ProtectedRoute>
                <AdminViewWrapper>
                  <QuizPage />
                </AdminViewWrapper>
              </ProtectedRoute>
            }
          />

          {/* Test routes */}
          <Route
            path="/tests/attempts/:attemptId/results"
            element={
              <ProtectedRoute>
                <AdminViewWrapper>
                  <TestResultsPage />
                </AdminViewWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tests/history/:levelId"
            element={
              <ProtectedRoute>
                <AdminViewWrapper>
                  <TestHistoryPage />
                </AdminViewWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tests/:testId/take"
            element={
              <ProtectedRoute>
                <AdminViewWrapper>
                  <TestPage />
                </AdminViewWrapper>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tests/:testId"
            element={
              <ProtectedRoute>
                <AdminViewWrapper>
                  <AssessmentEntryPage />
                </AdminViewWrapper>
              </ProtectedRoute>
            }
          />

          {/* Assessment routes */}
          <Route path="/assessment/:assessmentType/:assessmentId" element={
            <ProtectedRoute>
              <AdminViewWrapper>
                <AssessmentEntryPage />
              </AdminViewWrapper>
            </ProtectedRoute>
          } />

          <Route path="/assessment/results/:attemptId" element={
            <ProtectedRoute>
              <AdminViewWrapper>
                <AssessmentResultsRouter />
              </AdminViewWrapper>
            </ProtectedRoute>
          } />

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
      <AuthProvider>
        <ProfileProvider>
          <AdminProvider>
            <Router>
              <MainLayout />
            </Router>
          </AdminProvider>
        </ProfileProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
