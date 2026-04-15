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

app.use('*', async (c, next) => {
  const start = Date.now()
  const requestId = crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
  c.set('requestId', requestId)

  try {
    await next()
  } finally {
    const durationMs = Date.now() - start
    const status = c.res.status || 0
    const user = c.get('user')
    const entry = {
      level: 'info',
      request_id: requestId,
      method: c.req.method,
      path: c.req.path,
      status,
      duration_ms: durationMs,
      user_id: user?.id || null,
    }
    console.log(JSON.stringify(entry))
  }
})

app.use('*', cors({
  origin: (origin, c) => {
    const allowed = parseAllowedOrigins(c.env.ALLOWED_ORIGINS)
    // Allow same-origin/non-browser requests that do not send Origin.
    if (!origin) return null
    if (allowed.includes(origin)) return origin
    return null
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

const requireAdminRole = async (c, next) => {
  const supabase = c.get('supabase')
  const user = c.get('user')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    return c.json({ error: 'Unable to resolve user role' }, 403)
  }

  if (!['company_admin', 'super_admin'].includes(profile.role)) {
    return c.json({ error: 'Admin access required' }, 403)
  }

  await next()
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

const getWorkerCapabilities = (env) => ({
  mode: 'worker',
  supportsLegacyAdminApi: false,
  supportsLegacyDataCountApi: true,
  supportsLegacyDataClearApi: true,
  supportsLegacyUserListApi: true,
  supportsLegacyUserCreateApi: true,
  supportsLegacyUserDeleteApi: Boolean(env?.SUPABASE_SERVICE_ROLE_KEY),
  supportsLegacyReportsApi: false,
  supportsLegacyReportMetricsApi: true,
  supportsLegacyReportPdfApi: true,
  supportsLegacyValidationApi: true,
})

const escapePdfText = (value) =>
  String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')

const buildSimplePdfBuffer = (lines) => {
  const safeLines = lines.map(escapePdfText)
  const maxLinesPerPage = 42
  const pages = []

  for (let i = 0; i < safeLines.length; i += maxLinesPerPage) {
    pages.push(safeLines.slice(i, i + maxLinesPerPage))
  }
  if (pages.length === 0) pages.push(['No report data available'])

  const objects = []
  const addObject = (content) => {
    objects.push(content)
    return objects.length
  }

  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  const pageIds = []
  for (const pageLines of pages) {
    let y = 800
    const textBody = pageLines
      .map((line) => {
        const chunk = `1 0 0 1 50 ${y} Tm (${line}) Tj`
        y -= 16
        return chunk
      })
      .join('\n')

    const streamContent = `BT\n/F1 12 Tf\n${textBody}\nET`
    const contentId = addObject(`<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`)
    const pageId = addObject(`<< /Type /Page /Parent __PAGES_ID__ 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`)
    pageIds.push(pageId)
  }

  const kidsRefs = pageIds.map((id) => `${id} 0 R`).join(' ')
  const pagesId = addObject(`<< /Type /Pages /Kids [ ${kidsRefs} ] /Count ${pageIds.length} >>`)
  objects[0] = objects[0]
  for (const pageId of pageIds) {
    objects[pageId - 1] = objects[pageId - 1].replace('__PAGES_ID__', pagesId)
  }
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`)

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`
  }

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return new TextEncoder().encode(pdf)
}

app.get('/', (c) => {
  const configured = Boolean(c.env.SUPABASE_URL && c.env.SUPABASE_ANON_KEY)
  const capabilities = getWorkerCapabilities(c.env)
  return c.json({
    message: 'Wastewater Monitoring API',
    version: '1.0.0',
    status: 'healthy',
    supabase_configured: configured,
    sheets_backup_configured: isSheetsBackupConfigured(c.env),
    capabilities,
  })
})

app.get('/capabilities', (c) => c.json(getWorkerCapabilities(c.env)))

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

app.post('/api/validation/check', authMiddleware, async (c) => {
  const supabase = c.get('supabase')
  const payload = await c.req.json()
  const value = Number(payload?.value)
  const parameterId = payload?.parameter_id

  if (!Number.isFinite(value) || !parameterId) {
    return c.json({ valid: false, message: 'parameter_id and numeric value are required' }, 400)
  }

  const { data: standard, error } = await supabase
    .from('standards')
    .select('min_limit, max_limit')
    .eq('parameter_id', parameterId)
    .eq('class', 'C')
    .limit(1)
    .single()

  if (error || !standard) {
    return c.json({ valid: true, warning: 'No standard found for this parameter' })
  }

  const min = Number(standard.min_limit ?? 0)
  const max = Number(standard.max_limit ?? 0)
  if (value < min || value > max) {
    return c.json({ valid: false, message: `Value out of range (${min}-${max})` })
  }

  const margin = (max - min) * 0.1
  if (value < min + margin || value > max - margin) {
    return c.json({ valid: true, warning: `Value approaching limit (${min}-${max})` })
  }

  return c.json({ valid: true, message: 'Value is within standard range' })
})

app.get('/api/reports/summary', authMiddleware, async (c) => {
  const supabase = c.get('supabase')
  const start = c.req.query('start')
  const end = c.req.query('end')
  const now = new Date()
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const defaultEnd = now.toISOString()

  let query = supabase
    .from('measurements')
    .select(`
      id,
      value,
      timestamp,
      parameter_id,
      parameters!inner(name),
      alerts(id, resolved)
    `)
    .gte('timestamp', start || defaultStart)
    .lte('timestamp', end || defaultEnd)

  const { data, error } = await query
  if (error) return c.json({ error: error.message }, 500)

  const rows = data || []
  const totals = rows.length
  const byParam = new Map()
  let compliant = 0

  const { data: standards } = await supabase
    .from('standards')
    .select('parameter_id,min_limit,max_limit')
    .eq('class', 'C')

  const standardsMap = new Map((standards || []).map((s) => [s.parameter_id, s]))
  for (const row of rows) {
    const pid = row.parameter_id
    const pname = row.parameters?.name || 'unknown'
    if (!byParam.has(pname)) byParam.set(pname, { compliant: 0, total: 0 })
    const stat = byParam.get(pname)
    stat.total += 1

    const std = standardsMap.get(pid)
    if (std && Number(row.value) >= Number(std.min_limit) && Number(row.value) <= Number(std.max_limit)) {
      stat.compliant += 1
      compliant += 1
    }
  }

  const activeAlerts = rows.reduce((acc, r) => {
    const alerts = Array.isArray(r.alerts) ? r.alerts : []
    return acc + alerts.filter((a) => !a.resolved).length
  }, 0)

  return c.json({
    count: totals,
    parameters: Object.fromEntries(byParam),
    compliance_rate: totals > 0 ? Number(((compliant / totals) * 100).toFixed(2)) : 100,
    alerts: activeAlerts,
  })
})

app.get('/api/reports/performance', authMiddleware, async (c) => {
  const supabase = c.get('supabase')
  const days = parseInt(c.req.query('days') || '30', 10)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('measurements')
    .select('id,timestamp')
    .gte('timestamp', since)

  if (error) return c.json({ error: error.message }, 500)

  const rows = data || []
  const dailyCounts = new Map()
  for (const row of rows) {
    const d = String(row.timestamp).slice(0, 10)
    dailyCounts.set(d, (dailyCounts.get(d) || 0) + 1)
  }

  const avgDaily = dailyCounts.size > 0 ? rows.length / dailyCounts.size : 0
  return c.json({
    period_days: days,
    total_measurements: rows.length,
    avg_daily_measurements: Number(avgDaily.toFixed(2)),
    compliance_trend: 'stable',
    alert_frequency: 0,
    days_with_data: dailyCounts.size,
  })
})

app.get('/api/reports/daily', authMiddleware, async (c) => {
  const supabase = c.get('supabase')
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('measurements')
    .select('id,timestamp')
    .gte('timestamp', since)

  if (error) return c.json({ error: error.message }, 500)

  return c.json({
    date: new Date().toISOString().slice(0, 10),
    measurement_count: (data || []).length,
    compliance_rate: 100,
    alerts: 0,
    parameters: {},
    summary: `Daily report: ${(data || []).length} measurements.`,
  })
})

app.get('/api/reports/pdf', authMiddleware, async (c) => {
  const supabase = c.get('supabase')
  const start = c.req.query('start')
  const end = c.req.query('end')
  const rawParameters = c.req.query('parameters') || ''
  const selectedParameters = rawParameters
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean)
  const selectedSet = new Set(selectedParameters)

  const now = new Date()
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const defaultEnd = now.toISOString()

  const { data, error } = await supabase
    .from('measurements')
    .select(`
      value,
      type,
      timestamp,
      parameters!inner(name, display_name, unit),
      plants!inner(name)
    `)
    .gte('timestamp', start || defaultStart)
    .lte('timestamp', end || defaultEnd)
    .order('timestamp', { ascending: false })
    .limit(1500)

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  const filtered = (data || []).filter((row) => {
    if (selectedSet.size === 0) return true
    const key = String(row.parameters?.name || '').toLowerCase()
    return selectedSet.has(key)
  })

  const headerStart = (start || defaultStart).slice(0, 10)
  const headerEnd = (end || defaultEnd).slice(0, 10)
  const lines = [
    'Wastewater Monitoring Report',
    `Period: ${headerStart} to ${headerEnd}`,
    `Generated: ${new Date().toISOString()}`,
    `Total rows: ${filtered.length}`,
    selectedSet.size > 0 ? `Filters: ${[...selectedSet].join(', ')}` : 'Filters: none',
    '------------------------------------------------------------',
  ]

  const previewRows = filtered.slice(0, 250)
  for (const row of previewRows) {
    const parameter = row.parameters?.display_name || row.parameters?.name || 'Unknown'
    const unit = row.parameters?.unit || ''
    const plant = row.plants?.name || 'Unknown plant'
    const value = Number(row.value)
    const ts = String(row.timestamp || '').replace('T', ' ').slice(0, 19)
    lines.push(`${ts} | ${plant} | ${parameter} ${Number.isFinite(value) ? value : '-'} ${unit} | ${row.type || 'effluent'}`)
  }

  if (filtered.length > previewRows.length) {
    lines.push(`... ${filtered.length - previewRows.length} additional rows omitted for compact export ...`)
  }

  const pdfBytes = buildSimplePdfBuffer(lines)
  const filename = `wastewater_report_${headerStart}_to_${headerEnd}.pdf`
  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
})

app.get('/api/data/count', authMiddleware, requireAdminRole, async (c) => {
  const supabase = c.get('supabase')
  const { count, error } = await supabase
    .from('measurements')
    .select('*', { count: 'exact', head: true })

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  const total = Number(count || 0)
  return c.json({
    count: total,
    message: `Total measurements: ${total}`,
  })
})

app.get('/api/users', authMiddleware, requireAdminRole, async (c) => {
  const supabase = c.get('supabase')
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .order('created_at', { ascending: false })

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  const users = (data || []).map((profile) => {
    const mappedRole = profile.role === 'company_admin'
      ? 'admin'
      : profile.role === 'viewer'
        ? 'client'
        : 'operator'
    return {
      id: profile.id,
      username: profile.full_name || String(profile.id).slice(0, 8),
      role: mappedRole,
    }
  })

  return c.json(users)
})

app.post('/api/users', authMiddleware, requireAdminRole, async (c) => {
  const supabase = c.get('supabase')
  const payload = await c.req.json()
  const username = String(payload?.username || '').trim()
  const password = String(payload?.password || '')
  const role = String(payload?.role || 'operator')

  if (!username || !password) {
    return c.json({ error: 'Username and password required' }, 400)
  }

  const mappedRole = role === 'admin'
    ? 'company_admin'
    : role === 'client'
      ? 'viewer'
      : 'operator'

  const email = username.includes('@')
    ? username
    : `${username}@worker.local`

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: username,
        role: mappedRole,
      },
    },
  })

  if (error) {
    return c.json({ error: error.message }, 400)
  }

  return c.json({
    success: true,
    id: data.user?.id,
    username,
    role,
  }, 201)
})

app.delete('/api/users/:id', authMiddleware, requireAdminRole, async (c) => {
  const supabase = c.get('supabase')
  const requester = c.get('user')
  const { id } = c.req.param()

  if (!id) {
    return c.json({ error: 'User id is required' }, 400)
  }
  if (requester?.id === id) {
    return c.json({ error: 'You cannot delete your own account from this endpoint' }, 400)
  }

  const { data: targetProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', id)
    .single()

  if (profileError || !targetProfile) {
    return c.json({ error: 'User profile not found' }, 404)
  }
  if (['company_admin', 'super_admin'].includes(targetProfile.role)) {
    return c.json({ error: 'Admin accounts are protected and cannot be deleted from this endpoint' }, 403)
  }

  const serviceRoleKey = c.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return c.json({
      error: 'User delete requires SUPABASE_SERVICE_ROLE_KEY in Worker environment',
    }, 501)
  }

  const adminSupabase = createClient(c.env.SUPABASE_URL || '', serviceRoleKey, {
    auth: { persistSession: false },
  })
  const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(id)
  if (deleteError) {
    return c.json({ error: deleteError.message }, 500)
  }

  return c.json({
    success: true,
    id,
    message: `Deleted user ${targetProfile.full_name || id}`,
  })
})

app.delete('/api/data/clear', authMiddleware, requireAdminRole, async (c) => {
  const supabase = c.get('supabase')

  const { data: rows, error: readError } = await supabase
    .from('measurements')
    .select('id')

  if (readError) {
    return c.json({ error: readError.message }, 500)
  }

  const ids = (rows || []).map((r) => r.id)
  if (ids.length === 0) {
    return c.json({ success: true, message: 'Deleted 0 measurements', count: 0 })
  }

  const { error: deleteError } = await supabase
    .from('measurements')
    .delete()
    .in('id', ids)

  if (deleteError) {
    return c.json({ error: deleteError.message }, 500)
  }

  return c.json({
    success: true,
    message: `Deleted ${ids.length} measurements`,
    count: ids.length,
  })
})

app.delete('/api/data/clear/:start/:end', authMiddleware, requireAdminRole, async (c) => {
  const supabase = c.get('supabase')
  const { start, end } = c.req.param()

  if (!start || !end) {
    return c.json({ error: 'start and end date are required' }, 400)
  }

  const startIso = new Date(`${start}T00:00:00.000Z`).toISOString()
  const endIso = new Date(`${end}T23:59:59.999Z`).toISOString()

  const { data: rows, error: readError } = await supabase
    .from('measurements')
    .select('id')
    .gte('timestamp', startIso)
    .lte('timestamp', endIso)

  if (readError) {
    return c.json({ error: readError.message }, 500)
  }

  const ids = (rows || []).map((r) => r.id)
  if (ids.length === 0) {
    return c.json({
      success: true,
      message: `Deleted 0 measurements from ${start} to ${end}`,
      count: 0,
    })
  }

  const { error: deleteError } = await supabase
    .from('measurements')
    .delete()
    .in('id', ids)

  if (deleteError) {
    return c.json({ error: deleteError.message }, 500)
  }

  return c.json({
    success: true,
    message: `Deleted ${ids.length} measurements from ${start} to ${end}`,
    count: ids.length,
  })
})

app.get('/auth/me', authMiddleware, async (c) => {
  const supabase = c.get('supabase')
  const user = c.get('user')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, full_name, company_id')
    .eq('id', user.id)
    .single()

  if (error) {
    // Keep endpoint resilient if profile row is missing.
    return c.json({
      user,
      profile: null,
    })
  }

  return c.json({
    user,
    profile,
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

app.get('/api/alerts/dashboard', authMiddleware, async (c) => {
  const supabase = c.get('supabase')
  const { data, error } = await supabase
    .from('alerts')
    .select(`
      id,
      resolved,
      resolved_at,
      created_at,
      severity,
      measurements!inner(
        id,
        value,
        timestamp,
        plants!inner(name),
        parameters!inner(name, display_name)
      )
    `)
    .eq('resolved', false)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return c.json({ error: error.message }, 500)
  }

  const alerts = (data || []).map((item) => {
    const measurement = item.measurements || {}
    const parameter = measurement.parameters?.display_name || measurement.parameters?.name || 'Unknown'
    return {
      id: item.id,
      parameter,
      value: measurement.value,
      status: item.severity || 'warning',
      severity: item.severity || 'warning',
      state: item.resolved ? 'resolved' : 'active',
      timestamp: item.created_at || measurement.timestamp,
      resolved_at: item.resolved_at || null,
      plant: measurement.plants?.name || '',
    }
  })

  const critical = alerts.filter((a) => a.severity === 'critical').length
  const warning = alerts.filter((a) => a.severity === 'warning').length

  return c.json({
    total: alerts.length,
    critical,
    warning,
    alerts: alerts.slice(0, 10),
  })
})

app.patch('/alerts/:id/resolve', authMiddleware, requireAdminRole, zValidator('json', alertResolveSchema), async (c) => {
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
  const requestId = c.get('requestId') || null
  console.error(JSON.stringify({
    level: 'error',
    request_id: requestId,
    method: c.req.method,
    path: c.req.path,
    message: err?.message || String(err),
    stack: err?.stack || null,
  }))
  return c.json({ error: 'Internal server error' }, 500)
})

app.notFound((c) => {
  return c.json({ error: 'Endpoint not found' }, 404)
})

export default app
