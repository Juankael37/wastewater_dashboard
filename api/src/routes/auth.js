/**
 * Auth routes — login, register, profile.
 */
import { Hono } from 'hono'
import { authMiddleware, errorResponse } from '../middleware.js'

const auth = new Hono()

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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name, role: role || 'viewer' } },
  })

  if (error) return errorResponse(c, 400, error.message, 'AUTH_REGISTER_FAILED')

  return c.json({ user: data.user, session: data.session })
})

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
