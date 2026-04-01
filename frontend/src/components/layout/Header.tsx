import React from 'react'
import { Droplets, Wifi, WifiOff } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useOffline } from '../../contexts/OfflineContext'

const Header: React.FC = () => {
  const { user } = useAuth()
  const { isOnline, pendingSyncCount } = useOffline()

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
          {/* Online/Offline Status */}
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <>
                <Wifi className="w-5 h-5 text-green-500" />
                <span className="text-sm text-green-600">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-amber-500" />
                <span className="text-sm text-amber-600">Offline</span>
              </>
            )}
            
            {pendingSyncCount > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                {pendingSyncCount} pending
              </span>
            )}
          </div>

          {/* User Profile */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {user?.user_metadata?.full_name || user?.email || 'Operator'}
              </p>
              <p className="text-xs text-gray-500">
                {user?.email || 'operator@example.com'}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold">
                {(user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'O').toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header