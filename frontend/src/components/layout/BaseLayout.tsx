import React from 'react'
import { Outlet } from 'react-router-dom'

interface Props {
  header: React.ReactNode
  navigation: React.ReactNode
}

/** Shared shell layout — used by both Operator (Layout) and AquaDash (AquaLayout). */
const BaseLayout: React.FC<Props> = ({ header, navigation }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-200 text-gray-900 dark:text-white">
      {header}
      <div className="flex">
        {navigation}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default BaseLayout
