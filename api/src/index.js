/**
 * Wastewater Monitoring API — Cloudflare Worker entry point.
 *
 * This file is intentionally slim. All route logic lives in dedicated modules:
 *   routes/auth.js       — /auth/*
 *   routes/measurements.js — /measurements, /parameters, /standards, /plants, /api/validation/*
 *   routes/alerts.js     — /alerts, /api/alerts/*
 *   routes/reports.js    — /api/reports/*
 *   routes/admin.js      — /api/users, /api/parameters, /api/data/*
 *   middleware.js        — shared middleware, schemas, utilities
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { createClient } from '@supabase/supabase-js'
import { isSheetsBackupConfigured } from './sheetsBackup.js'
import { getWorkerCapabilities } from './middleware.js'

import authRoutes from './routes/auth.js'
import measurementRoutes from './routes/measurements.js'
import alertRoutes from './routes/alerts.js'
import reportRoutes from './routes/reports.js'
import adminRoutes from './routes/admin.js'
import settingsRoutes from './routes/settings.js'

const app = new Hono()

// ---------------------------------------------------------------------------
// CORS helpers
// ---------------------------------------------------------------------------

const LAN_DEV_ORIGINS_TOKEN = 'LAN_DEV_ORIGINS'

const parseAllowedOrigins = (raw) =>
  (raw || `${LAN_DEV_ORIGINS_TOKEN},http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173`)
    .split(',').map((s) => s.trim()).filter(Boolean)

const isPrivateIpv4Host = (host) => {
  const parts = String(host || '').split('.').map((p) => Number(p))
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false
  if (parts[0] === 10) return true
  if (parts[0] === 192 && parts[1] === 168) return true
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
  return false
}

const isLanDevOrigin = (origin) => {
  try {
    const url = new URL(origin)
    if (url.protocol !== 'http:') return false
    if (!['4173', '5173'].includes(url.port || '80')) return false
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1' || isPrivateIpv4Host(url.hostname)
  } catch { return false }
}

const matchesWildcard = (origin, pattern) => {
  if (!pattern.includes('*')) return origin === pattern
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^.]+')
  try { return new RegExp(`^${escaped}$`).test(origin) } catch { return false }
}

const isAllowedOrigin = (origin, allowed) =>
  allowed.includes(origin) || allowed.some((p) => p.includes('*') && matchesWildcard(origin, p))

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------

app.use('*', logger())

// Request ID + structured access log
app.use('*', async (c, next) => {
  const start = Date.now()
  const requestId = crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
  c.set('requestId', requestId)
  try { await next() } finally {
    console.log(JSON.stringify({
      level: 'info', request_id: requestId,
      method: c.req.method, path: c.req.path,
      status: c.res.status || 0, duration_ms: Date.now() - start,
      user_id: c.get('user')?.id || null,
    }))
  }
})

app.use('*', cors({
  origin: (origin, c) => {
    const allowed = parseAllowedOrigins(c.env.ALLOWED_ORIGINS)
    if (!origin) return null
    if (isAllowedOrigin(origin, allowed)) return origin
    if (allowed.includes(LAN_DEV_ORIGINS_TOKEN) && isLanDevOrigin(origin)) return origin
    return null
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}))

// Inject Supabase client (forwarding caller JWT for RLS)
app.use('*', async (c, next) => {
  const url = c.env.SUPABASE_URL
  const key = c.env.SUPABASE_ANON_KEY
  if (!url || !key) console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
  const authHeader = c.req.header('Authorization')
  const isAuthRoute = c.req.path.startsWith('/auth/')
  const supabase = createClient(url || '', key || '', {
    auth: { persistSession: false },
    global: authHeader && !isAuthRoute ? { headers: { Authorization: authHeader } } : {},
  })
  c.set('supabase', supabase)
  await next()
})

// ---------------------------------------------------------------------------
// Health & capabilities
// ---------------------------------------------------------------------------

app.get('/', (c) => {
  const capabilities = getWorkerCapabilities(c.env)
  return c.json({
    message: 'Wastewater Monitoring API',
    version: '1.0.0',
    status: 'healthy',
    supabase_configured: Boolean(c.env.SUPABASE_URL && c.env.SUPABASE_ANON_KEY),
    sheets_backup_configured: isSheetsBackupConfigured(c.env),
    capabilities,
  })
})

app.get('/capabilities', (c) => c.json(getWorkerCapabilities(c.env)))

// ---------------------------------------------------------------------------
// Route modules
// ---------------------------------------------------------------------------

app.route('/auth', authRoutes)
app.route('/', measurementRoutes)
app.route('/', alertRoutes)
app.route('/', reportRoutes)
app.route('/', adminRoutes)
app.route('/', settingsRoutes)

// ---------------------------------------------------------------------------
// Error & 404 handlers
// ---------------------------------------------------------------------------

app.onError((err, c) => {
  const requestId = c.get('requestId') || null
  console.error(JSON.stringify({
    level: 'error', request_id: requestId,
    method: c.req.method, path: c.req.path,
    message: err?.message || String(err),
    stack: err?.stack || null,
  }))
  return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500)
})

app.notFound((c) => c.json({ error: 'Endpoint not found', code: 'NOT_FOUND' }, 404))

import { generateDailyReportHtml, sendEmailViaResend } from './emailService.js'

export default {
  fetch: app.fetch,
  async scheduled(event, env, ctx) {
    console.log('Running scheduled daily report trigger...');
    
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    try {
      // 1. Get all active report recipients
      const { data: recipients, error: rErr } = await supabase
        .from('report_settings')
        .select('email')
        .eq('is_active', true)
        .eq('frequency', 'daily');

      if (rErr) throw rErr;
      if (!recipients || recipients.length === 0) {
        console.log('No active daily report recipients found.');
        return;
      }

      // 2. Get plant info (assuming one plant for now, or fetch all)
      const { data: plants } = await supabase.from('plants').select('name').limit(1);
      const plantName = plants?.[0]?.name || 'Wastewater Plant';

      // 3. Generate content
      const htmlContent = await generateDailyReportHtml(supabase, plantName);

      // 4. Send emails
      for (const recipient of recipients) {
        console.log(`Sending daily report to ${recipient.email}...`);
        await sendEmailViaResend(env, {
          to: recipient.email,
          subject: `AquaDash Daily Report - ${plantName}`,
          htmlContent,
        });
      }
      console.log('Scheduled task completed successfully.');
    } catch (err) {
      console.error('Scheduled task failed:', err);
    }
  }
}
