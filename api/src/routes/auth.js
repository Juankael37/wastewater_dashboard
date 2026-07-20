/**
 * Auth routes — login, register, profile.
 */
import { Hono } from 'hono'
import { authMiddleware, errorResponse } from '../middleware.js'

const auth = new Hono()

// Canonical confirmation landing path. Both /auth/confirm (primary) and the
// legacy /auth/verify are accepted by the frontend; this is where the email
// link and Supabase redirect-URL config must point.
const CONFIRM_PATH = '/auth/confirm'

const appUrl = (c) =>
  (c.env.PUBLIC_APP_URL || 'https://wilc.ortuma.site').replace(/\/$/, '')

const confirmRedirectTo = (c) => `${appUrl(c)}${CONFIRM_PATH}`

auth.post('/login', async (c) => {
  const supabase = c.get('supabase')
  const { email, password } = await c.req.json()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return errorResponse(c, 401, error.message, 'AUTH_LOGIN_FAILED')

  return c.json({ user: data.user, session: data.session })
})

auth.post('/register', async (c) => {
  const supabase = c.get('supabase')
  const { email, password, full_name, role } = await c.req.json()

  const redirectTo = confirmRedirectTo(c)

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, role: role || 'viewer' },
      emailRedirectTo: redirectTo,
    },
  })

  if (error) return errorResponse(c, 400, error.message, 'AUTH_REGISTER_FAILED')

  // Supabase returns a session only when email confirmation is disabled,
  // or when the user is immediately signed in. No session means the account
  // was created but awaits email verification.
  const needsConfirmation = !data.session

  return c.json({ user: data.user, session: data.session, needsConfirmation })
})

auth.post('/resend-verification', async (c) => {
  const supabase = c.get('supabase')
  const { email } = await c.req.json()

  if (!email) return errorResponse(c, 400, 'Email is required', 'VALIDATION_ERROR')

  const redirectTo = confirmRedirectTo(c)

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: redirectTo },
  })

  if (error) return errorResponse(c, 400, error.message, 'AUTH_RESEND_FAILED')

  return c.json({ message: 'Verification email sent' })
})

const exchangeAndRedirect = async (c) => {
  const supabase = c.get('supabase')
  const code = c.req.query('code')

  if (!code) return errorResponse(c, 400, 'Missing verification code', 'VALIDATION_ERROR')

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  const base = appUrl(c)
  if (error) {
    return c.redirect(
      `${base}${CONFIRM_PATH}?status=error&message=${encodeURIComponent(error.message)}`,
      302,
    )
  }

  const params = new URLSearchParams({ status: 'success' })
  if (data.session?.access_token) params.set('token', data.session.access_token)
  return c.redirect(`${base}${CONFIRM_PATH}?${params.toString()}`, 302)
}

// Primary confirmation landing (used by the email link + Supabase redirect config).
auth.get('/confirm', exchangeAndRedirect)
// Legacy alias kept for already-sent links / backward compatibility.
auth.get('/verify', exchangeAndRedirect)

auth.get('/me', authMiddleware, async (c) => {
  const supabase = c.get('supabase')
  const user = c.get('user')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, full_name, company_id')
    .eq('id', user.id)
    .single()

  if (error) {
    return c.json({ user, profile: null })
  }

  return c.json({ user, profile })
})

export default auth
