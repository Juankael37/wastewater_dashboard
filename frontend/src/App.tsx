import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { OfflineProvider } from './contexts/OfflineContext'
// v2 trigger
import { ThemeProvider } from './contexts/ThemeContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminRoute from './components/auth/AdminRoute'
import AquaLayout from './components/layout/AquaLayout'
import Layout from './components/layout/Layout'
import LoadingSpinner from './components/common/LoadingSpinner'

// Lazy-loaded pages — each gets its own chunk for faster initial load
const AquaLoginPage = lazy(() => import('./pages/auth/AquaLoginPage'))
const OperatorLoginPage = lazy(() => import('./pages/auth/OperatorLoginPage'))
const SignupPage = lazy(() => import('./pages/auth/SignupPage'))
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))
const GraphsPage = lazy(() => import('./pages/dashboard/GraphsPage'))
const InputPage = lazy(() => import('./pages/input/InputPage'))
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'))
const AlertsPage = lazy(() => import('./pages/alerts/AlertsPage'))
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const LandingPage = lazy(() => import('./pages/landing/LandingPage'))

// Dynamically select the layout based on user role
const DynamicLayout = () => {
  const { user } = useAuth()
  const activePortal = localStorage.getItem('active_portal')
  
  // If explicitly in operator portal, or if user is exclusively an operator
  if (activePortal === 'operator' || user?.role === 'operator') {
    return <Layout />
  }
  
  return <AquaLayout />
}

function App() {
  return (
    <ThemeProvider>
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
        
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Public landing page */}
            <Route path="/" element={<LandingPage />} />

            {/* TWO SEPARATE LOGINS - per project.md */}
            <Route path="/login/aquadash" element={<AquaLoginPage />} />
            <Route path="/login/operator" element={<OperatorLoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            
            {/* Shared routes (Dynamic Layout) */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DynamicLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/graphs" element={<GraphsPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
              </Route>
            </Route>
            
            {/* AquaDash exclusive routes (DARK theme) */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AquaLayout />}>
                <Route path="/reports" element={<ReportsPage />} />
              </Route>
            </Route>
            
            {/* Admin-only */}
            <Route element={<AdminRoute />}>
              <Route element={<AquaLayout />}>
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
            
            {/* Operator routes (LIGHT theme) - data input */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/input" element={<InputPage />} />
              </Route>
            </Route>
            
            {/* Default redirect */}
            <Route path="/login" element={<Navigate to="/login/aquadash" replace />} />
            
            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </OfflineProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}

export default App