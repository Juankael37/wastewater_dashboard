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
import richPdfRoutes from './routes/richPdf.js'
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
app.route('/', richPdfRoutes)
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

import { generateReportHtml, sendEmailViaResend } from './emailService.js'
import { buildRichPdfBuffer } from './routes/richPdf.js'

export default {
  fetch: app.fetch,
  async scheduled(event, env, ctx) {
    console.log('Running scheduled report trigger...');
    
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    try {
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday
      const dayOfMonth = today.getDate(); // 1-31

      let frequencies = ['daily'];
      if (dayOfWeek === 1) frequencies.push('weekly');
      if (dayOfMonth === 1) frequencies.push('monthly');

      const { data: recipients, error: rErr } = await supabase
        .from('report_settings')
        .select('email, frequency')
        .eq('is_active', true)
        .in('frequency', frequencies);

      if (rErr) throw rErr;
      if (!recipients || recipients.length === 0) {
        console.log('No active recipients for today.');
        return;
      }

      const { data: plants } = await supabase.from('plants').select('name').limit(1);
      const plantName = plants?.[0]?.name || 'Wastewater Treatment Plant';

      // Group recipients by frequency
      const freqGroups = { daily: [], weekly: [], monthly: [] };
      for (const r of recipients) {
        if (freqGroups[r.frequency]) freqGroups[r.frequency].push(r.email);
      }

      // CRON Date Logic
      // Daily: Previous full calendar day (yesterday)
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const dailyStart = yesterday.toISOString().slice(0, 10);
      const dailyEnd = dailyStart;

      // Weekly: Previous full week (Mon-Sun)
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - (dayOfWeek === 0 ? 7 : dayOfWeek - 1) - 7 + dayOfWeek);
      const weekStartDate = new Date(weekStart);
      const weekEnd = new Date(weekStartDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weeklyStart = weekStartDate.toISOString().slice(0, 10);
      const weeklyEnd = weekEnd.toISOString().slice(0, 10);

      // Monthly: Previous full calendar month
      const monthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      const monthlyStart = monthStart.toISOString().slice(0, 10);
      const monthlyEnd = monthEnd.toISOString().slice(0, 10);

      const dateRanges = {
        daily: { start: dailyStart, end: dailyEnd, label: dailyStart },
        weekly: { start: weeklyStart, end: weeklyEnd, label: `${weeklyStart} to ${weeklyEnd}` },
        monthly: { start: monthlyStart, end: monthlyEnd, label: `${monthStart.toLocaleString('en-US', { month: 'long' })} ${monthStart.getFullYear()}` }
      };

      for (const freq of Object.keys(freqGroups)) {
        const emails = freqGroups[freq];
        if (emails.length === 0) continue;

        const range = dateRanges[freq];
        console.log(`Generating ${freq} report for ${range.label} to ${emails.length} recipients...`);
        const htmlContent = await generateReportHtml(supabase, plantName, freq);

        try {
          console.log(`Building rich PDF for ${freq} (${range.start} to ${range.end})...`);
          const pdfBytes = await buildRichPdfBuffer(env, supabase, {
            startDate: range.start,
            endDate: range.end,
            title: plantName
          });

          // base64 encode using btoa and Uint8Array
          let binary = '';
          for (let i = 0; i < pdfBytes.length; i++) {
            binary += String.fromCharCode(pdfBytes[i]);
          }
          const pdfBase64 = btoa(binary);

          const attachments = [{
            filename: `AquaDash_${freq}_report_${range.start}_${range.end}.pdf`,
            content: pdfBase64
          }];

          const subject = `[${freq.charAt(0).toUpperCase() + freq.slice(1)}] Wastewater Compliance Report - ${range.label}`;

          for (const email of emails) {
            console.log(`Sending ${freq} report to ${email}...`);
            try {
              await sendEmailViaResend(env, {
                to: email,
                subject,
                htmlContent,
                attachments
              });
              console.log(`Sent to ${email}`);
            } catch (emailErr) {
              console.error(`Failed to send to ${email}:`, emailErr.message);
            }
          }
        } catch (pdfErr) {
          console.error(`PDF generation failed for ${freq}:`, pdfErr.message);
        }
      }
      console.log('Scheduled tasks completed successfully.');
    } catch (err) {
      console.error('Scheduled task failed:', err);
    }
  }
}
