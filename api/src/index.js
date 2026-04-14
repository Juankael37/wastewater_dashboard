import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { appendMeasurementRow, isSheetsBackupConfigured } from './sheetsBackup.js'

const app = new Hono()

const parseAllowedOrigins = (raw) =>
  (raw || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

app.use('*', logger())

app.use('*', cors({
  origin: (origin, c) => {
    const allowed = parseAllowedOrigins(c.env.ALLOWED_ORIGINS)
    if (origin && allowed.includes(origin)) return origin
    return allowed[0] || 'http://localhost:5173'
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}))

/** Cloudflare Workers expose bindings on `c.env` (not process.env). */
/** Forward caller JWT so PostgREST applies RLS as that user (auth.uid()). */
app.use('*', async (c, next) => {
  const url = c.env.SUPABASE_URL
  const key = c.env.SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
  }
  const authHeader = c.req.header('Authorization')
  const isAuthRoute = c.req.path.startsWith('/auth/')
  const supabase = createClient(url || '', key || '', {
    auth: { persistSession: false },
    global: authHeader && !isAuthRoute
      ? { headers: { Authorization: authHeader } }
      : {},
  })
  c.set('supabase', supabase)
  await next()
})

const authMiddleware = async (c, next) => {
  const supabase = c.get('supabase')
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.split(' ')[1]

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return c.json({ error: 'Invalid token' }, 401)
    }

    c.set('user', user)
    await next()
  } catch {
    return c.json({ error: 'Authentication failed' }, 401)
  }
}

const measurementSchema = z.object({
  plant_id: z.string().uuid(),
  parameter_id: z.string().uuid(),
  value: z.number(),
  type: z.enum(['influent', 'effluent']),
  timestamp: z.string().datetime().optional(),
  notes: z.string().optional(),
})

const alertResolveSchema = z.object({
  resolved: z.boolean(),
})

app.get('/', (c) => {
  const configured = Boolean(c.env.SUPABASE_URL && c.env.SUPABASE_ANON_KEY)
  return c.json({
    message: 'Wastewater Monitoring API',
    version: '1.0.0',
    status: 'healthy',
    supabase_configured: configured,
    sheets_backup_configured: isSheetsBackupConfigured(c.env),
  })
})

app.post('/auth/login', async (c) => {
  const supabase = c.get('supabase')
  const { email, password } = await c.req.json()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return c.json({ error: error.message }, 401)
  }

  return c.json({
    user: data.user,
    session: data.session,
  })
})

app.post('/auth/register', async (c) => {
  const supabase = c.get('supabase')
  const { email, password, full_name, role } = await c.req.json()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        role: role || 'viewer',
      },
    },
  })

  if (error) {
    return c.json({ error: error.message }, 400)
  }

  return c.json({
    user: data.user,
    session: data.session,
  })
})

app.get('/measurements', authMiddleware, async (c) => {
  const supabase = c.get('supabase')
  const { plant_id, parameter_id, start_date, end_date, limit = 100 } = c.req.query()

  let query = supabase
    .from('measurements')
    .select(`
      *,
      plants!inner(name, location),
      parameters!inner(name, display_name, unit)
    `)
    .order('timestamp', { ascending: false })
    .limit(parseInt(limit, 10))

  if (plant_id) {
    query = query.eq('plant_id', plant_id)
  }

  if (parameter_id) {
    query = query.eq('parameter_id', parameter_id)
  }

  if (start_date) {
    query = query.gte('timestamp', start_date)
  }

  if (end_date) {
    query = query.lte('timestamp', end_date)
  }

  const { data, error } = await query

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json({ data })
})

app.post('/measurements', authMiddleware, zValidator('json', measurementSchema), async (c) => {
  const supabase = c.get('supabase')
  const user = c.get('user')
  const measurement = c.req.valid('json')

  const { data, error } = await supabase
    .from('measurements')
    .insert({
      ...measurement,
      operator_id: user.id,
      timestamp: measurement.timestamp || new Date().toISOString(),
    })
    .select(`
      *,
      plants!inner(name),
      parameters!inner(name, display_name, unit)
    `)
    .single()

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  const operatorEmail = user.email || ''
  const backupPromise = appendMeasurementRow(c.env, {
    measurement: data,
    operatorEmail,
  })

  const exec = c.executionCtx
  if (exec?.waitUntil) {
    exec.waitUntil(
      backupPromise.catch((err) => console.error('[sheets] backup error', err))
    )
  } else {
    await backupPromise.catch((err) => console.error('[sheets] backup error', err))
  }

  return c.json({ data }, 201)
})

app.get('/measurements/:id', authMiddleware, async (c) => {
  const supabase = c.get('supabase')
  const { id } = c.req.param()

  const { data, error } = await supabase
    .from('measurements')
    .select(`
      *,
      plants!inner(*),
      parameters!inner(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    return c.json({ error: error.message }, 404)
  }

  return c.json({ data })
})

app.get('/alerts', authMiddleware, async (c) => {
  const supabase = c.get('supabase')
  const { resolved, limit = 50 } = c.req.query()

  let query = supabase
    .from('alerts')
    .select(`
      *,
      measurements!inner(
        *,
        plants!inner(*),
        parameters!inner(*)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(parseInt(limit, 10))

  if (resolved !== undefined) {
    query = query.eq('resolved', resolved === 'true')
  }

  const { data, error } = await query

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json({ data })
})

app.patch('/alerts/:id/resolve', authMiddleware, zValidator('json', alertResolveSchema), async (c) => {
  const supabase = c.get('supabase')
  const user = c.get('user')
  const { id } = c.req.param()
  const { resolved } = c.req.valid('json')

  const { data, error } = await supabase
    .from('alerts')
    .update({
      resolved,
      resolved_at: resolved ? new Date().toISOString() : null,
      resolved_by: resolved ? user.id : null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json({ data })
})

app.get('/parameters', authMiddleware, async (c) => {
  const supabase = c.get('supabase')
  const { active } = c.req.query()

  let query = supabase
    .from('parameters')
    .select('*')
    .order('name')

  if (active !== undefined) {
    query = query.eq('is_active', active === 'true')
  }

  const { data, error } = await query

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json({ data })
})

app.get('/standards', authMiddleware, async (c) => {
  const supabase = c.get('supabase')
  const { class: standardClass } = c.req.query()

  let query = supabase
    .from('standards')
    .select(`
      *,
      parameters!inner(*)
    `)
    .order('parameter_id')

  if (standardClass) {
    query = query.eq('class', standardClass)
  }

  const { data, error } = await query

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json({ data })
})

app.get('/plants', authMiddleware, async (c) => {
  const supabase = c.get('supabase')

  const { data, error } = await supabase
    .from('plants')
    .select('*')
    .order('name')

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  return c.json({ data })
})

app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Internal server error' }, 500)
})

app.notFound((c) => {
  return c.json({ error: 'Endpoint not found' }, 404)
})

export default app
