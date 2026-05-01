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
  local_timestamp: z.string().optional(),
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
  supportsLegacyAdminApi: Boolean(env?.SUPABASE_SERVICE_ROLE_KEY),
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

// ---------------------------------------------------------------------------
// Enhanced PDF Builder with Tables and ASCII Charts
// ---------------------------------------------------------------------------

const ESC_CHARS = /[\\()]/g
const escapePdf_str = (s) => String(s ?? '').replace(ESC_CHARS, (m) => m === '\\' ? '\\\\' : m === '(' ? '\\(' : '\\)')

const padLeft = (s, w) => String(s).slice(0, w).padStart(w)
const padRight = (s, w) => String(s).slice(0, w).padEnd(w)

export const buildAsciiBar = (value, maxVal, width = 20) => {
  if (!Number.isFinite(value)) return ''.padStart(width, '-')
  const filled = maxVal > 0 ? Math.round((value / maxVal) * width) : 0
  const bar = '█'.repeat(Math.min(filled, width))
  return bar.padEnd(width, '░')
}

export const buildTablePdfBuffer = (title, subtitle, headers, rows, maxVal = null) => {
  if (headers.length === 0) return buildSimplePdfBuffer([title, 'No data'])

  const colWidths = headers.map((h) => Math.max(h.length, 8))
  const totalWidth = colWidths.reduce((a, w) => a + w + 1, 0) + 1

  const lines = []

  lines.push(padRight(title, totalWidth))
  if (subtitle) lines.push(padRight(subtitle, totalWidth))
  lines.push(''.padEnd(totalWidth, '-'))

  let headerLine = '│'
  for (let i = 0; i < headers.length; i += 1) {
    headerLine += padRight(headers[i], colWidths[i]) + '│'
  }
  lines.push(headerLine)
  lines.push(''.padEnd(totalWidth, '─'))

  for (const row of rows) {
    let line = '│'
    for (let i = 0; i < row.length; i += 1) {
      const cell = i === row.length - 1 && maxVal && Number.isFinite(row[i])
        ? buildAsciiBar(row[i], maxVal, Math.min(colWidths[i], 10))
        : String(row[i] ?? '-')
      line += padRight(cell, colWidths[i]) + '│'
    }
    lines.push(line)
  }

  lines.push(''.padEnd(totalWidth, '─'))
  return buildSimplePdfBuffer(lines)
}

export const buildFormattedPdfBuffer = (opts) => {
  const {
    title = 'Report',
    subtitle = '',
    dateRange = '',
    generatedAt = new Date().toISOString(),
    summary = {},
    parameterStats = [],
    rawData = [],
    maxRawRows = 300,
  } = opts

  const lines = []
  const maxLinesPerPage = 38

  lines.push(padRight(title, 70))
  lines.push(padRight(subtitle, 70))
  lines.push(`Date Range: ${dateRange}`)
  lines.push(`Generated: ${generatedAt}`)
  lines.push(''.padEnd(70, '='))

  if (Object.keys(summary).length > 0) {
    lines.push('')
    lines.push('SUMMARY')
    lines.push(''.padEnd(70, '-'))
    for (const [k, v] of Object.entries(summary)) {
      lines.push(`  ${padRight(k, 25)}: ${v}`)
    }
  }

  if (parameterStats.length > 0) {
    lines.push('')
    lines.push('PARAMETER STATISTICS')
    lines.push(''.padEnd(70, '-'))
    lines.push(padRight('Parameter', 15) + '│' + padRight('Latest', 10) + '│' + padRight('Min', 8) + '│' + padRight('Max', 8) + '│' + padRight('Avg', 8) + '│Trend (last 10)')
    lines.push(''.padEnd(70, '─'))

    const maxVals = {}
    for (const ps of parameterStats) {
      const vals = ps.recent || []
      maxVals[ps.name] = Math.max(...vals, ps.max || 1)
    }

    for (const ps of parameterStats) {
      const latest = Number.isFinite(ps.latest) ? ps.latest.toFixed(2) : '-'
      const min = Number.isFinite(ps.min) ? ps.min.toFixed(2) : '-'
      const max = Number.isFinite(ps.max) ? ps.max.toFixed(2) : '-'
      const avg = Number.isFinite(ps.avg) ? ps.avg.toFixed(2) : '-'

      const trend = (ps.recent || []).slice(-10).map((v) => {
        const mx = maxVals[ps.name] || 1
        return mx > 0 ? (v / mx >= 0.7 ? '█' : v / mx >= 0.4 ? '▓' : '░') : '-'
      }).join('')

      const name = padRight(ps.name, 13).slice(0, 13)
      lines.push(`${name} │ ${padLeft(latest, 8)} │ ${padLeft(min, 6)} │ ${padLeft(max, 6)} │ ${padLeft(avg, 6)} │ ${trend}`)
    }
  }

  if (rawData.length > 0) {
    lines.push('')
    lines.push('RAW DATA (sample)')
    lines.push(''.padEnd(70, '-'))
    for (const row of rawData.slice(0, maxRawRows)) {
      const ts = String(row.timestamp || '').replace('T', ' ').slice(0, 19)
      const p = padRight(String(row.parameter || '').slice(0, 15), 15)
      const v = Number.isFinite(row.value) ? row.value.toFixed(2) : '-'
      const unit = row.unit || ''
      lines.push(`${ts} │ ${p} │ ${v} ${unit}`)
    }
    if (rawData.length > maxRawRows) {
      lines.push(`... ${rawData.length - maxRawRows} additional rows omitted ...`)
    }
  }

  const pages = []
  for (let i = 0; i < lines.length; i += maxLinesPerPage) {
    pages.push(lines.slice(i, i + maxLinesPerPage))
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
        const chunk = `1 0 0 1 40 ${y} Tm (${escapePdf_str(line)}) Tj`
        y -= 14
        return chunk
      })
      .join('\n')

    const streamContent = `BT\n/F1 10 Tf\n${textBody}\nET`
    const contentId = addObject(`<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`)
    const pageId = addObject(`<< /Type /Page /Parent __PAGES_ID__ 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`)
    pageIds.push(pageId)
  }

  const kidsRefs = pageIds.map((id) => `${id} 0 R`).join(' ')
  const pagesId = addObject(`<< /Type /Pages /Kids [ ${kidsRefs} ] /Count ${pageIds.length} >>`)
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
