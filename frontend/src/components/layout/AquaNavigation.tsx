import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home,
  FileText,
  AlertTriangle,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  BarChart2
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const AquaNavigation: React.FC = () => {
  const { signOut, user } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  const isAdmin = user?.role === 'admin'
  
  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/graphs', icon: BarChart2, label: 'Graphs' },
    { path: '/reports', icon: FileText, label: 'Reports' },
    { path: '/alerts', icon: AlertTriangle, label: 'Alerts' },
    ...(isAdmin ? [{ path: '/settings', icon: Settings, label: 'Settings' }] : []),
  ]

  return (
    <nav className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 min-h-[calc(100vh-4rem)] p-4 transition-all duration-300 relative`}>
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-full p-1 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white z-10"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      <div className="space-y-2 mt-4">
        {!isCollapsed && (
          <div className="px-4 py-3 mb-4 transition-opacity">
            <h1 className="text-2xl font-bold text-teal-600 dark:text-teal-400">AquaDash</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">Monitoring System</p>
          </div>
        )}
        
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3 px-4'} py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-teal-50 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 border-l-4 border-teal-600 dark:border-teal-400'
                  : 'text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`
            }
            title={isCollapsed ? item.label : undefined}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="font-medium truncate">{item.label}</span>}
          </NavLink>
        ))}
        
        <button
          onClick={() => signOut()}
          className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3 px-4'} py-3 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 w-full mt-8 transition-colors`}
          title={isCollapsed ? "Sign Out" : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium truncate">Sign Out</span>}
        </button>
      </div>
    </nav>
  )
}

export default AquaNavigation