import React from 'react'
import { Droplets, Wifi, WifiOff } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useOffline } from '../../contexts/OfflineContext'
import ThemeToggle from '../common/ThemeToggle'

const Header: React.FC = () => {
  const { user } = useAuth()
  const { isOnline, pendingSyncCount } = useOffline()
  const roleLabel = user?.role ? user.role.replace('_', ' ') : 'operator'
  const displayName = user?.full_name || user?.username || user?.email || 'Operator'
  const statusLabel = isOnline ? 'Online' : 'Offline'
  const roleClassName =
    user?.role === 'admin'
      ? 'text-purple-600 dark:text-purple-400'
      : user?.role === 'client'
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-blue-600 dark:text-blue-400'

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-3 py-3 md:px-6 md:py-4 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 md:space-x-4">
          <Droplets className="w-6 h-6 md:w-8 md:h-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-base md:text-xl font-bold text-gray-900 dark:text-white">Wastewater</h1>
            <p className="hidden md:block text-sm text-gray-500 dark:text-slate-400">Treatment Plant Monitoring</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          <ThemeToggle />
          
          {/* Identity + Connectivity Badge - Simplified on mobile */}
          <div className="flex items-center space-x-2 md:space-x-3 rounded-lg md:rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-2 md:px-3 py-1.5 md:py-2 transition-colors">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-500 dark:text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            )}
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{displayName}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                <span className={`capitalize font-medium ${roleClassName}`}>{roleLabel}</span>
                <span> · {statusLabel}</span>
              </p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                {(displayName[0] || 'O').toUpperCase()}
              </span>
            </div>
            {pendingSyncCount > 0 && (
              <span className="px-1.5 py-0.5 md:px-2 md:py-1 text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 rounded-full">
                {pendingSyncCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header