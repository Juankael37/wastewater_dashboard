import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { authApi } from '../../services/api'
import { Eye, EyeOff, Mail, Lock, UserPlus, Send } from 'lucide-react'
import WaterBubbles from '../../components/landing/WaterBubbles'

const AquaLoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [resendError, setResendError] = useState('')
  
  const { signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setUnconfirmed(false)
    setIsLoading(true)

    try {
      localStorage.clear()
      await signIn(email, password)
      localStorage.setItem('active_portal', 'aquadash')
      
      const userStr = localStorage.getItem('ww_access_token')
      if (userStr) {
        try {
          const payload = JSON.parse(atob(userStr.split('.')[1]))
          const role = payload?.user_metadata?.role || payload?.role || 'client'
          if (role === 'operator') {
            window.location.href = '/login/operator'
            return
          }
        } catch {}
      }
      
      window.location.href = '/dashboard'
    } catch (err: any) {
      const raw = err.message || 'Failed to sign in'
      if (/email not confirmed|not confirmed|verify your email/i.test(raw)) {
        setUnconfirmed(true)
        setError('Your email is not verified yet. Please check your inbox for the confirmation link, or resend it below.')
      } else {
        setError(raw)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    setResendError('')
    setResendState('sending')
    try {
      await authApi.resendVerification(email)
      setResendState('sent')
    } catch (err: any) {
      setResendError(err.message || 'Failed to resend verification email')
      setResendState('idle')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900 px-4">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <WaterBubbles />
      </div>

      {/* Back to home */}
      <Link to="/" className="absolute top-6 left-6 text-sm text-slate-400 hover:text-teal-400 flex items-center gap-1 transition-colors z-10">
        ← Back to Home
      </Link>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/Official Header logo.png" alt="Logo" className="h-20 w-auto mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white">Client & Admin Portal</h2>
          <p className="mt-2 text-sm text-slate-400">Sign in to access your dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                  placeholder="admin@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm">{error}</div>
            )}

            {unconfirmed && (
              <div className="space-y-3">
                {resendState === 'sent' ? (
                  <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-xl text-sm">
                    Verification email resent. Check your inbox.
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendState === 'sending' || !email}
                    className="w-full inline-flex items-center justify-center gap-2 bg-slate-700/50 hover:bg-slate-700 text-white py-3 rounded-xl font-semibold disabled:opacity-50 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    {resendState === 'sending' ? 'Sending…' : 'Resend confirmation email'}
                  </button>
                )}
                {resendError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm">{resendError}</div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:from-teal-400 hover:to-cyan-400 disabled:opacity-50 transition-all shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/signup" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-teal-400 transition-colors">
              <UserPlus className="w-4 h-4" />
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AquaLoginPage
