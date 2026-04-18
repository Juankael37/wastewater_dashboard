import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home,
  PlusCircle,
  AlertTriangle,
  LogOut
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const Navigation: React.FC = () => {
  const { signOut } = useAuth()
  
  // Main operator navigation; admin tooling is capability-gated elsewhere.
  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/input', icon: PlusCircle, label: 'Input Data' },
    { path: '/alerts', icon: AlertTriangle, label: 'Alerts' },
  ]

  return (
    <nav className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] p-4">
      <div className="space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
        
        <button
          onClick={() => signOut()}
          className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 w-full mt-8"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </nav>
  )
}

export default Navigation