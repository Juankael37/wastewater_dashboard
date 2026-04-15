import React from 'react'
import { Droplets, Wifi, WifiOff } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useOffline } from '../../contexts/OfflineContext'

const Header: React.FC = () => {
  const { user } = useAuth()
  const { isOnline, pendingSyncCount } = useOffline()
  const roleLabel = user?.role ? user.role.replace('_', ' ') : 'operator'
  const displayName = user?.full_name || user?.username || user?.email || 'Operator'
  const statusLabel = isOnline ? 'Online' : 'Offline'
  const roleClassName =
    user?.role === 'admin'
      ? 'text-purple-600'
      : user?.role === 'client'
        ? 'text-emerald-600'
        : 'text-blue-600'

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Droplets className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Wastewater Monitor</h1>
              <p className="text-sm text-gray-500">Treatment Plant Monitoring System</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {/* Identity + Connectivity Badge */}
          <div className="flex items-center space-x-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-amber-500" />
            )}
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-500">
                <span className={`capitalize font-medium ${roleClassName}`}>{roleLabel}</span>
                <span> · {statusLabel}</span>
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold">
                {(displayName[0] || 'O').toUpperCase()}
              </span>
            </div>
            {pendingSyncCount > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                {pendingSyncCount} pending
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header