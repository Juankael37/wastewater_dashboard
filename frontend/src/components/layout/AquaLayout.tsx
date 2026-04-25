import React from 'react'
import { Outlet } from 'react-router-dom'
import Navigation from './Navigation'
import Header from './Header'

const AquaLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900">
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

export default AquaLayout