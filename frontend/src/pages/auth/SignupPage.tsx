import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { authApi } from '../../services/api'
import { Eye, EyeOff, Mail, Lock, User, Send } from 'lucide-react'
import WaterBubbles from '../../components/landing/WaterBubbles'

const RESEND_COOLDOWN = 60

const SignupPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [resendError, setResendError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const { signUp } = useAuth()
  const navigate = useNavigate()

  useEffect(() => () => {
    if (cooldownTimer.current) clearInterval(cooldownTimer.current)
  }, [])

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN)
    if (cooldownTimer.current) clearInterval(cooldownTimer.current)
    cooldownTimer.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setIsLoading(true)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    try {
      const { needsConfirmation: pending } = await signUp(fullName, password, email, 'client')
      if (pending) {
        setNeedsConfirmation(true)
        setInfo('If you already started signing up, we\'ve resent the confirmation link to your inbox.')
      } else {
        navigate('/login/aquadash')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0) return
    setResendError('')
    setResendState('sending')
    try {
      await authApi.resendVerification(email)
      setResendState('sent')
      startCooldown()
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
          {needsConfirmation ? (
            <>
              <h2 className="text-2xl font-bold text-white">Check your email</h2>
              <p className="mt-2 text-sm text-slate-400">We sent a verification link to {email}</p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white">Create Account</h2>
              <p className="mt-2 text-sm text-slate-400">Join the wastewater monitoring platform</p>
            </>
          )}
        </div>

        {/* Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 shadow-2xl">
          {needsConfirmation ? (
            <div className="text-center space-y-5">
              <Mail className="w-14 h-14 text-teal-400 mx-auto" />
              <h2 className="text-xl font-bold text-white">Confirm your email</h2>
              <p className="text-sm text-slate-300">
                We've sent a verification link to:
              </p>
              <div className="bg-slate-900/60 border border-slate-700 rounded-xl py-3 px-4">
                <span className="text-sm font-medium text-teal-300 break-all">{email}</span>
              </div>
              <p className="text-sm text-slate-400">
                Open your email app (Gmail, Outlook, or your provider's inbox) and click the <span className="text-slate-200 font-medium">Confirm your email</span> button in the message from Wil-C. You won't be able to sign in until your address is verified.
              </p>
              <p className="text-xs text-slate-500">
                Don't see it? Check your spam or junk folder, or resend the email below.
              </p>

              {info && (
                <div className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 p-3 rounded-xl text-sm">
                  {info}
                </div>
              )}

              {resendState === 'sent' && !resendError ? (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-xl text-sm">
                  Verification email resent. Check your inbox (and spam folder).
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendState === 'sending' || cooldown > 0}
                  className="w-full inline-flex items-center justify-center gap-2 bg-slate-700/50 hover:bg-slate-700 text-white py-3 rounded-xl font-semibold disabled:opacity-50 transition-all"
                >
                  <Send className="w-4 h-4" />
                  {cooldown > 0
                    ? `Resend available in ${cooldown}s`
                    : resendState === 'sending'
                      ? 'Sending…'
                      : 'Resend verification email'}
                </button>
              )}

              {resendError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm">{resendError}</div>
              )}

              <div className="pt-2">
                <Link to="/login/aquadash" className="text-sm text-teal-400 hover:text-teal-300 transition-colors">
                  Back to sign in
                </Link>
              </div>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                  placeholder="you@company.com"
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
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
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

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                  placeholder="Re-enter password"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm">{error}</div>
            )}

            <label className="flex items-start gap-3 cursor-pointer text-sm text-slate-300">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-700/50 text-teal-500 focus:ring-2 focus:ring-teal-400 cursor-pointer"
                required
              />
              <span>
                I agree to the{' '}
                <Link to="/terms" className="text-teal-400 hover:text-teal-300 transition-colors">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-teal-400 hover:text-teal-300 transition-colors">Privacy Policy</Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={isLoading || !agreedToTerms}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:from-teal-400 hover:to-cyan-400 disabled:opacity-50 transition-all shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Already have an account?{' '}
              <Link to="/login/aquadash" className="text-teal-400 hover:text-teal-300 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignupPage
