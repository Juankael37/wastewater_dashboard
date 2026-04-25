import React from 'react'
import { Droplets, Wifi, WifiOff } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useOffline } from '../../contexts/OfflineContext'

const AquaHeader: React.FC = () => {
  const { user } = useAuth()
  const { isOnline, pendingSyncCount } = useOffline()
  const roleLabel = user?.role ? user.role.replace('_', ' ') : 'operator'
  const displayName = user?.full_name || user?.username || user?.email || 'Operator'
  const statusLabel = isOnline ? 'Online' : 'Offline'
  const roleClassName =
    user?.role === 'admin'
      ? 'text-purple-400'
      : user?.role === 'client'
        ? 'text-emerald-400'
        : 'text-blue-400'

  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Droplets className="w-8 h-8 text-teal-400" />
            <div>
              <h1 className="text-xl font-bold text-white">AquaDash</h1>
              <p className="text-sm text-slate-400">Client Portal</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3 rounded-xl border border-slate-600 bg-slate-700 px-3 py-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-amber-400" />
            )}
            <div className="text-right">
              <p className="text-sm font-medium text-white">{displayName}</p>
              <p className="text-xs text-slate-400">
                <span className={`capitalize font-medium ${roleClassName}`}>{roleLabel}</span>
                <span> · {statusLabel}</span>
              </p>
            </div>
            <div className="w-10 h-10 bg-teal-500/20 rounded-full flex items-center justify-center">
              <span className="text-teal-400 font-semibold">
                {(displayName[0] || 'O').toUpperCase()}
              </span>
            </div>
            {pendingSyncCount > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full">
                {pendingSyncCount} pending
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default AquaHeader