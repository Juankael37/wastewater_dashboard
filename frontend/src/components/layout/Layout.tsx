import React from 'react'
import { Outlet } from 'react-router-dom'
import Navigation from './Navigation'
import Header from './Header'

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-200 text-gray-900 dark:text-white">
      <Header />
      <div className="flex">
        <Navigation />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout