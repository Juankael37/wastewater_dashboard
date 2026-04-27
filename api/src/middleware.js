/**
 * Shared middleware, validation schemas, and utility functions.
 */

import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

export const authMiddleware = async (c, next) => {
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

export const requireAdminRole = async (c, next) => {
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

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

export const measurementSchema = z.object({
  plant_id: z.string().uuid(),
  parameter_id: z.string().uuid(),
  value: z.number(),
  type: z.enum(['influent', 'effluent']),
  timestamp: z.string().datetime().optional(),
  notes: z.string().optional(),
})

export const alertResolveSchema = z.object({
  resolved: z.boolean(),
})

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

export const getWorkerCapabilities = (env) => ({
  mode: 'worker',
  supportsLegacyAdminApi: false,
  supportsLegacyParameterWriteApi: true,
  supportsLegacyDataCountApi: true,
  supportsLegacyDataClearApi: true,
  supportsLegacyDataImportApi: true,
  supportsLegacyDataExportApi: true,
  supportsLegacyUserListApi: true,
  supportsLegacyUserCreateApi: true,
  supportsLegacyUserDeleteApi: Boolean(env?.SUPABASE_SERVICE_ROLE_KEY),
  supportsLegacyReportsApi: false,
  supportsLegacyReportMetricsApi: true,
  supportsLegacyReportPdfApi: true,
  supportsLegacyValidationApi: true,
})

// ---------------------------------------------------------------------------
// Standardized error response helper
// ---------------------------------------------------------------------------

/**
 * Return a consistent JSON error response.
 * @param {import('hono').Context} c
 * @param {number} status  HTTP status code
 * @param {string} message Human-readable error message
 * @param {string} [code]  Optional machine-readable error code
 */
export const errorResponse = (c, status, message, code) => {
  const body = { error: message }
  if (code) body.code = code
  return c.json(body, status)
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

export const csvRowToObject = (line, headers) => {
  const values = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (ch === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
      continue
    }

    current += ch
  }
  values.push(current.trim())

  const row = {}
  headers.forEach((h, idx) => {
    row[h] = values[idx] || ''
  })
  return row
}

export const toCsvCell = (value) => {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export const toParameterPayload = (name, standardRow) => ({
  id: standardRow?.id || standardRow?.parameter_id || name,
  parameter: name,
  min_limit: Number(standardRow?.min_limit ?? 0),
  max_limit: Number(standardRow?.max_limit ?? 0),
})

export const escapePdfText = (value) =>
  String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')

export const buildSimplePdfBuffer = (lines) => {
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

/** Create a service-role Supabase client (bypasses RLS). */
export const createServiceClient = (env) => {
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return null
  return createClient(env.SUPABASE_URL || '', key, {
    auth: { persistSession: false },
  })
}
