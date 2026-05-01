import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home,
  PlusCircle,
  AlertTriangle,
  LogOut
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const MobileNav: React.FC = () => {
  const { signOut } = useAuth()

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Home' },
    { path: '/input', icon: PlusCircle, label: 'Input' },
    { path: '/alerts', icon: AlertTriangle, label: 'Alerts' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 safe-area-pb z-50 md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors min-w-[60px] ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-slate-400'
              }`
            }
          >
            <div className={`p-2 rounded-full ${location.pathname === item.path ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium mt-1">{item.label}</span>
          </NavLink>
        ))}
        
        <button
          onClick={() => signOut()}
          className="flex flex-col items-center justify-center py-2 px-3 rounded-lg text-gray-500 dark:text-slate-400 min-w-[60px]"
        >
          <div className="p-2">
            <LogOut className="w-5 h-5" />
          </div>
          <span className="text-xs font-medium mt-1">Exit</span>
        </button>
      </div>
    </nav>
  )
}

export default MobileNav