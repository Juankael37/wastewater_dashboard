import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../common/LoadingSpinner'

const ProtectedRoute = () => {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    // Go to aquadash login - both admins and operators use this
    return <Navigate to="/login/aquadash" replace />
  }

  return <Outlet />
}

export default ProtectedRoute