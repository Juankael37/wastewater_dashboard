import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Droplets } from 'lucide-react'

const AquaLoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const { signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Clear any existing session first
      localStorage.removeItem('ww_access_token')
      localStorage.removeItem('aq_access_token')
      
      await signIn(email, password)
      
      // Full page redirect to FORCE new page load
      window.location.href = '/dashboard'
    } catch (err: any) {
      setError(err.message || 'Failed to sign in')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-br from-teal-400 to-cyan-500 p-4 rounded-2xl">
                <Droplets className="w-10 h-10 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white">AquaDash</h2>
            <p className="mt-2 text-sm text-slate-400">Client & Admin Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                placeholder="admin@company.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/20 text-red-400 p-3 rounded-lg text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-teal-500 text-white py-3 rounded-lg font-semibold hover:bg-teal-600 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign In to AquaDash'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login/operator" className="text-sm text-slate-400 hover:text-teal-400">
              Switch to Operator Login →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AquaLoginPage