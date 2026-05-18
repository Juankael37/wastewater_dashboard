import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home,
  PlusCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  BarChart2
} from 'lucide-react'

const Navigation: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/graphs', icon: BarChart2, label: 'Graphs' },
    { path: '/input', icon: PlusCircle, label: 'Input Data' },
    { path: '/alerts', icon: AlertTriangle, label: 'Alerts' },
  ]

  return (
    <nav className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 min-h-[calc(100vh-3.5rem)] p-3 transition-all duration-300 relative`}>
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-4 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-full p-1.5 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white z-10 shadow-sm"
      >
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      <div className="space-y-1 mt-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3 px-3'} py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 font-medium'
                  : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:text-gray-900 dark:hover:text-slate-200'
              }`
            }
            title={isCollapsed ? item.label : undefined}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm truncate">{item.label}</span>}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default Navigation
