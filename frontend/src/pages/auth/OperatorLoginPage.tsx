import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { authApi } from '../../services/api'
import { Eye, EyeOff, Mail, Lock, UserPlus, Send } from 'lucide-react'
import WaterBubbles from '../../components/landing/WaterBubbles'

const OperatorLoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [resendError, setResendError] = useState('')
  
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setUnconfirmed(false)
    setIsLoading(true)

    try {
      localStorage.removeItem('active_portal')
      await signIn(email, password)
      localStorage.setItem('active_portal', 'operator')
      navigate('/input')
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-cyan-50 px-4">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <WaterBubbles />
      </div>

      {/* Back to home */}
      <Link to="/" className="absolute top-6 left-6 text-sm text-gray-500 hover:text-blue-500 flex items-center gap-1 transition-colors z-10">
        ← Back to Home
      </Link>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/Official Header logo.png" alt="Logo" className="h-20 w-auto mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Operator Portal</h2>
          <p className="mt-2 text-sm text-gray-500">Sign in to input data</p>
        </div>

        {/* Card */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="operator@company.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{error}</div>
            )}

            {unconfirmed && (
              <div className="space-y-3">
                {resendState === 'sent' ? (
                  <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl text-sm">
                    Verification email resent. Check your inbox.
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendState === 'sending' || !email}
                    className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold disabled:opacity-50 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    {resendState === 'sending' ? 'Sending…' : 'Resend confirmation email'}
                  </button>
                )}
                {resendError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{resendError}</div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/signup" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-500 transition-colors">
              <UserPlus className="w-4 h-4" />
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OperatorLoginPage
