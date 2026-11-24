import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './presentation/hooks/useAuth';
import { Spinner } from './presentation/components/ui/Spinner';

import { TestPage } from './presentation/pages/TestPage';
import { LoginPage } from './presentation/pages/LoginPage';
import { DashboardPage } from './presentation/pages/DashboardPage';
import { BodyPage } from './presentation/pages/BodyPage';
import { WorkoutPage } from './presentation/pages/WorkoutPage';
import { NutritionPage } from './presentation/pages/NutritionPage';
import { ProgressPage } from './presentation/pages/ProgressPage';
import { SocialPage } from './presentation/pages/SocialPage';
import { AccessPage } from './presentation/pages/AccessPage';
import { HealthPage } from './presentation/pages/HealthPage';
import { SettingsPage } from './presentation/pages/SettingsPage';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
        }}
      >
        <Spinner size={36} />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const RootRedirect = () => {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
        }}
      >
        <Spinner size={36} />
      </div>
    );
  }

  return <Navigate to={isLoggedIn ? '/dashboard' : '/login'} replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/test" element={<TestPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/body" element={<ProtectedRoute><BodyPage /></ProtectedRoute>} />
      <Route path="/workout" element={<ProtectedRoute><WorkoutPage /></ProtectedRoute>} />
      <Route path="/nutrition" element={<ProtectedRoute><NutritionPage /></ProtectedRoute>} />
      <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
      <Route path="/social" element={<ProtectedRoute><SocialPage /></ProtectedRoute>} />
      <Route path="/access" element={<ProtectedRoute><AccessPage /></ProtectedRoute>} />
      <Route path="/health" element={<ProtectedRoute><HealthPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
