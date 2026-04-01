import React from 'react'
import { Link } from 'react-router-dom'
import { Home, AlertTriangle } from 'lucide-react'

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mb-8 flex justify-center">
          <div className="p-4 bg-amber-500/10 rounded-full">
            <AlertTriangle className="w-16 h-16 text-amber-500" />
          </div>
        </div>
        
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-white mb-4">Page Not Found</h2>
        
        <p className="text-slate-300 mb-8">
          The page you're looking for doesn't exist or has been moved. 
          Please check the URL or navigate back to the dashboard.
        </p>
        
        <div className="space-y-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg font-semibold hover:opacity-90 transition"
          >
            <Home className="w-5 h-5" />
            Return to Dashboard
          </Link>
          
          <div className="text-sm text-slate-400">
            <p>If you believe this is an error, please contact your system administrator.</p>
            <p className="mt-2">Error Code: 404_NOT_FOUND</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage