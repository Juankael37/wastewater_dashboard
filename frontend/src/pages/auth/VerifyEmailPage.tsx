import { useEffect, useState, useRef, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, ArrowRight, AlertTriangle, Send, Mail } from 'lucide-react'
import WaterBubbles from '../../components/landing/WaterBubbles'
import { authApi } from '../../services/api'
import { supabaseClient } from '../../services/supabaseClient'

const RESEND_COOLDOWN = 60

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') || 'signup'
  const status = searchParams.get('status')
  const message = searchParams.get('message')
  const emailParam = searchParams.get('email')

  const [state, setState] = useState<'processing' | 'success' | 'error'>(
    status === 'success' ? 'success' : status === 'error' ? 'error' : 'processing',
  )
  const [error, setError] = useState(message || '')
  const [resendEmail, setResendEmail] = useState(emailParam || '')
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [resendError, setResendError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const verifiedRef = useRef(false)

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

  useEffect(() => () => {
    if (cooldownTimer.current) clearInterval(cooldownTimer.current)
  }, [])

  useEffect(() => {
    // Legacy success redirect (Worker exchange flow) — already verified.
    if (status === 'success') {
      setState('success')
      const timer = setTimeout(() => {
        localStorage.setItem('active_portal', 'aquadash')
        navigate('/dashboard', { replace: true })
      }, 2500)
      return () => clearTimeout(timer)
    }

    if (status === 'error') {
      setError(decodeURIComponent(message || 'Email verification failed. Please try again.'))
      setState('error')
      return
    }

    // Primary flow: verify the OTP client-side with the token hash from the
    // confirmation link. Supabase's verifyOtp exchanges the hash for a session.
    if (tokenHash && !verifiedRef.current) {
      verifiedRef.current = true
      ;(async () => {
        const { error: verifyError } = await supabaseClient.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as any,
        })

        if (verifyError) {
          console.error('[verify] OTP failed:', verifyError.message)
          setError('This confirmation link is invalid or expired. Please request a new one.')
          setState('error')
          return
        }

        setState('success')
        const timer = setTimeout(() => {
          localStorage.setItem('active_portal', 'aquadash')
          navigate('/dashboard', { replace: true })
        }, 2500)
        return () => clearTimeout(timer)
      })()
      return
    }

    // No token and no explicit status — show a manual resend fallback instead
    // of an endless blank spinner.
    const stuckTimer = setTimeout(() => {
      if (state === 'processing') setState('error')
    }, 8000)
    return () => clearTimeout(stuckTimer)
  }, [status, message, tokenHash, type, navigate, state])

  const handleResend = async () => {
    if (cooldown > 0 || !resendEmail) return
    setResendError('')
    setResendState('sending')
    try {
      await authApi.resendVerification(resendEmail)
      setResendState('sent')
      startCooldown()
    } catch (err: any) {
      setResendError(err.message || 'Failed to resend verification email')
      setResendState('idle')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900 px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <WaterBubbles />
      </div>

      <Link to="/" className="absolute top-6 left-6 text-sm text-slate-400 hover:text-teal-400 flex items-center gap-1 transition-colors z-10">
        ← Back to Home
      </Link>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/Official Header logo.png" alt="Logo" className="h-20 w-auto mx-auto mb-4" />
        </div>

        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 shadow-2xl text-center">
          {state === 'processing' && (
            <>
              <div className="w-16 h-16 border-4 border-teal-400/30 border-t-teal-400 rounded-full animate-spin mx-auto mb-6" />
              <h2 className="text-xl font-bold text-white">Verifying your email…</h2>
              <p className="mt-2 text-sm text-slate-400">Please wait a moment.</p>
            </>
          )}

          {state === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-6" />
              <h2 className="text-xl font-bold text-white">Email verified!</h2>
              <p className="mt-2 text-sm text-slate-400">
                Your account is now active. Redirecting you to the dashboard…
              </p>
              <Link
                to="/dashboard"
                className="mt-6 inline-flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300 transition-colors"
              >
                Go to dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}

          {state === 'error' && (
            <>
              <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-6" />
              <h2 className="text-xl font-bold text-white">Verification failed</h2>
              <p className="mt-2 text-sm text-red-400">{error}</p>

              <div className="mt-6 space-y-3 text-left">
                <label className="block text-sm font-medium text-slate-300">Request a new confirmation email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                  />
                </div>

                {resendState === 'sent' && !resendError ? (
                  <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-xl text-sm">
                    Verification email resent. Check your inbox.
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendState === 'sending' || cooldown > 0 || !resendEmail}
                    className="w-full inline-flex items-center justify-center gap-2 bg-slate-700/50 hover:bg-slate-700 text-white py-3 rounded-xl font-semibold disabled:opacity-50 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    {cooldown > 0
                      ? `Resend available in ${cooldown}s`
                      : resendState === 'sending'
                        ? 'Sending…'
                        : 'Resend confirmation email'}
                  </button>
                )}

                {resendError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm">{resendError}</div>
                )}
              </div>

              <Link
                to="/login/aquadash"
                className="mt-6 inline-flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300 transition-colors"
              >
                Back to sign in <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default VerifyEmailPage
