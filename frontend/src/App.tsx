import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { OfflineProvider } from './contexts/OfflineContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Layout from './components/layout/Layout'

// Pages
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import ReportsPage from './pages/reports/ReportsPage'
import AlertsPage from './pages/alerts/AlertsPage'
import SettingsPage from './pages/settings/SettingsPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <AuthProvider>
      <OfflineProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f8fafc',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#f8fafc',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#f8fafc',
              },
            },
          }}
        />
        
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
          
          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </OfflineProvider>
    </AuthProvider>
  )
}

export default App