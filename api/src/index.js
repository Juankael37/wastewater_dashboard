import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

// Initialize Hono app
const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', cors({
  origin: ['http://localhost:5173', 'https://wastewater-monitor.pages.dev'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}))

// Supabase client
const supabaseUrl = 'https://your-project.supabase.co'
const supabaseKey = 'your-anon-key'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
})

// Authentication middleware
const authMiddleware = async (c, next) => {
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
  } catch (error) {
    return c.json({ error: 'Authentication failed' }, 401)
  }
}

// Validation schemas
const measurementSchema = z.object({
  plant_id: z.string().uuid(),
  parameter_id: z.string().uuid(),
  value: z.number(),
  type: z.enum(['influent', 'effluent']),
  timestamp: z.string().datetime().optional(),
  notes: z.string().optional()
})

const alertResolveSchema = z.object({
  resolved: z.boolean()
})

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    message: 'Wastewater Monitoring API',
    version: '1.0.0',
    status: 'healthy'
  })
})

// Authentication endpoints
app.post('/auth/login', async (c) => {
  const { email, password } = await c.req.json()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) {
    return c.json({ error: error.message }, 401)
  }
  
  return c.json({
    user: data.user,
    session: data.session
  })
})

app.post('/auth/register', async (c) => {
  const { email, password, full_name, role } = await c.req.json()
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        role: role || 'viewer'
      }
    }
  })
  
  if (error) {
    return c.json({ error: error.message }, 400)
  }
  
  return c.json({
    user: data.user,
    session: data.session
  })
})

// Measurements endpoints
app.get('/measurements', authMiddleware, async (c) => {
  const user = c.get('user')
  const { plant_id, parameter_id, start_date, end_date, limit = 100 } = c.req.query()
  
  let query = supabase
    .from('measurements')
    .select(`
      *,
      plants!inner(name, location),
      parameters!inner(name, display_name, unit)
    `)
    .order('timestamp', { ascending: false })
    .limit(parseInt(limit))
  
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
  const user = c.get('user')
  const measurement = c.req.valid('json')
  
  const { data, error } = await supabase
    .from('measurements')
    .insert({
      ...measurement,
      operator_id: user.id,
      timestamp: measurement.timestamp || new Date().toISOString()
    })
    .select()
    .single()
  
  if (error) {
    return c.json({ error: error.message }, 500)
  }
  
  return c.json({ data }, 201)
})

app.get('/measurements/:id', authMiddleware, async (c) => {
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

// Alerts endpoints
app.get('/alerts', authMiddleware, async (c) => {
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
    .limit(parseInt(limit))
  
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
  const user = c.get('user')
  const { id } = c.req.param()
  const { resolved } = c.req.valid('json')
  
  const { data, error } = await supabase
    .from('alerts')
    .update({
      resolved,
      resolved_at: resolved ? new Date().toISOString() : null,
      resolved_by: resolved ? user.id : null
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    return c.json({ error: error.message }, 500)
  }
  
  return c.json({ data })
})

// Parameters endpoints
app.get('/parameters', authMiddleware, async (c) => {
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

// Standards endpoints
app.get('/standards', authMiddleware, async (c) => {
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

// Plants endpoints
app.get('/plants', authMiddleware, async (c) => {
  const user = c.get('user')
  
  const { data, error } = await supabase
    .from('plants')
    .select('*')
    .order('name')
  
  if (error) {
    return c.json({ error: error.message }, 500)
  }
  
  return c.json({ data })
})

// Error handling
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Internal server error' }, 500)
})

app.notFound((c) => {
  return c.json({ error: 'Endpoint not found' }, 404)
})

export default app