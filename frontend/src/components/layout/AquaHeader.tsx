import React, { useState, useRef, useEffect } from 'react'
import { Wifi, WifiOff, LogOut, User, ChevronDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useOffline } from '../../contexts/OfflineContext'
import ThemeToggle from '../common/ThemeToggle'

const AquaHeader: React.FC = () => {
  const { user, signOut } = useAuth()
  const { isOnline, pendingSyncCount } = useOffline()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const roleLabel = user?.role ? user.role.replace('_', ' ') : 'operator'
  const displayName = user?.full_name || user?.username || user?.email || 'Operator'
  const statusLabel = isOnline ? 'Online' : 'Offline'
  const roleClassName =
    user?.role === 'admin'
      ? 'text-purple-600 dark:text-purple-400'
      : user?.role === 'client'
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-teal-600 dark:text-teal-400'

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-3 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img src="/Official Header logo.png" alt="Logo" className="h-9 w-auto" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Wastewater Dashboard</h1>
        </div>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          
          <div className="flex items-center space-x-2 text-sm">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-amber-500" />
            )}
            <span className="text-gray-500 dark:text-slate-400 hidden lg:inline">{statusLabel}</span>
          </div>

          {pendingSyncCount > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 rounded-full">
              {pendingSyncCount} pending
            </span>
          )}

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{displayName}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  <span className={`capitalize font-medium ${roleClassName}`}>{roleLabel}</span>
                </p>
              </div>
              <div className="w-9 h-9 bg-teal-100 dark:bg-teal-500/20 rounded-full flex items-center justify-center">
                <span className="text-teal-600 dark:text-teal-400 font-semibold text-sm">
                  {(displayName[0] || 'O').toUpperCase()}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{displayName}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{user?.email}</p>
                </div>
                <div className="px-4 py-2">
                  <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-slate-400">
                    <User className="w-3 h-3" />
                    <span className={`capitalize ${roleClassName}`}>{roleLabel}</span>
                    <span>·</span>
                    <span className={isOnline ? 'text-green-500' : 'text-amber-500'}>{statusLabel}</span>
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-slate-700 mt-1 pt-1">
                  <button
                    onClick={() => { signOut(); setDropdownOpen(false) }}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default AquaHeader