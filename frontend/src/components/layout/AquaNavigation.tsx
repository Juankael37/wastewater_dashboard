import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home,
  FileText,
  AlertTriangle,
  Settings,
  LogOut
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const AquaNavigation: React.FC = () => {
  const { signOut } = useAuth()
  
  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/reports', icon: FileText, label: 'Reports' },
    { path: '/alerts', icon: AlertTriangle, label: 'Alerts' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <nav className="w-64 bg-slate-800 border-r border-slate-700 min-h-[calc(100vh-4rem)] p-4">
      <div className="space-y-2">
        <div className="px-4 py-3 mb-4">
          <h1 className="text-2xl font-bold text-teal-400">AquaDash</h1>
          <p className="text-sm text-slate-400">Monitoring System</p>
        </div>
        
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-teal-500/20 text-teal-400 border-l-4 border-teal-400'
                  : 'text-slate-300 hover:bg-slate-700'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
        
        <button
          onClick={() => signOut()}
          className="flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700 w-full mt-8"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </nav>
  )
}

export default AquaNavigation