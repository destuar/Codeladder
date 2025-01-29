import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { AdminProvider } from './features/admin/AdminContext';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import ProfilePage from './features/profile/ProfilePage';
import ProtectedRoute from './components/ProtectedRoute';
import { Navigation } from './components/Navigation';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { useAdmin } from './features/admin/AdminContext';

// Placeholder components - you'll create these later
const DashboardPage = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold">Dashboard</h1>
  </div>
);

const UnauthorizedPage = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-xl text-destructive">
      You are not authorized to access this page.
    </div>
  </div>
);

// Wrap the main content to access admin context
function MainContent() {
  const { isAdminView, canAccessAdmin } = useAdmin();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      {isAdminView && canAccessAdmin ? (
        <AdminDashboard />
      ) : (
        <main>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Redirect root to dashboard or login */}
            <Route
              path="/"
              element={<Navigate to="/dashboard" replace />}
            />
          </Routes>
        </main>
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AdminProvider>
          <MainContent />
        </AdminProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
