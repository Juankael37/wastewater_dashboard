/**
 * Admin routes — users, parameters (CRUD), data import/export/clear.
 */
import { Hono } from 'hono'
import { authMiddleware, requireAdminRole, errorResponse, toParameterPayload, csvRowToObject, toCsvCell, createServiceClient } from '../middleware.js'

const admin = new Hono()

// --- Users ---

admin.get('/api/users', authMiddleware, requireAdminRole, async (c) => {
  const supabase = createServiceClient(c.env) || c.get('supabase')
  const { data, error } = await supabase.from('profiles').select('id, role, full_name').order('created_at', { ascending: false })
  if (error) return errorResponse(c, 500, error.message, 'USERS_FETCH_FAILED')
  const users = (data || []).map((p) => ({
    id: p.id,
    username: p.full_name || String(p.id).slice(0, 8),
    role: p.role === 'company_admin' ? 'admin' : p.role === 'viewer' ? 'client' : 'operator',
  }))
  return c.json(users)
})

admin.post('/api/users', authMiddleware, requireAdminRole, async (c) => {
  const supabase = c.get('supabase')
  const { username, password, role } = await c.req.json()
  if (!username || !password) return errorResponse(c, 400, 'Username and password required', 'USERS_MISSING_FIELDS')

  const mappedRole = role === 'admin' ? 'company_admin' : role === 'client' ? 'viewer' : 'operator'
  const email = username.includes('@') ? username : `${username}@worker.local`

  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: username, role: mappedRole } } })
  if (error) return errorResponse(c, 400, error.message, 'USER_CREATE_FAILED')

  return c.json({ success: true, id: data.user?.id, username, role }, 201)
})

admin.delete('/api/users/:id', authMiddleware, requireAdminRole, async (c) => {
  const supabase = c.get('supabase')
  const requester = c.get('user')
  const { id } = c.req.param()

  if (!id) return errorResponse(c, 400, 'User id is required', 'USER_ID_MISSING')
  if (requester?.id === id) return errorResponse(c, 400, 'You cannot delete your own account', 'USER_SELF_DELETE')

  const { data: target, error: pErr } = await supabase.from('profiles').select('id, role, full_name').eq('id', id).single()
  if (pErr || !target) return errorResponse(c, 404, 'User profile not found', 'USER_NOT_FOUND')
  if (['company_admin', 'super_admin'].includes(target.role)) return errorResponse(c, 403, 'Admin accounts are protected', 'USER_PROTECTED')

  const adminSupabase = createServiceClient(c.env)
  if (!adminSupabase) return errorResponse(c, 501, 'User delete requires SUPABASE_SERVICE_ROLE_KEY', 'USER_DELETE_UNSUPPORTED')

  const { error: delErr } = await adminSupabase.auth.admin.deleteUser(id)
  if (delErr) return errorResponse(c, 500, delErr.message, 'USER_DELETE_FAILED')

  return c.json({ success: true, id, message: `Deleted user ${target.full_name || id}` })
})

// --- Parameters ---

admin.get('/api/parameters', authMiddleware, async (c) => {
  const supabase = c.get('supabase')
  const { data, error } = await supabase.from('standards').select('id, parameter_id, min_limit, max_limit, class, parameters!inner(name)').eq('class', 'C').order('parameters(name)', { ascending: true })
  if (error) return errorResponse(c, 500, error.message, 'PARAMS_FETCH_FAILED')
  return c.json((data || []).map((row) => toParameterPayload(String(row.parameters?.name || '').toLowerCase(), row)))
})

admin.post('/api/parameters', authMiddleware, requireAdminRole, async (c) => {
  const supabase = c.get('supabase')
  const payload = await c.req.json()
  const name = String(payload?.parameter || '').trim().toLowerCase()
  const min = Number(payload?.min_limit)
  const max = Number(payload?.max_limit)

  if (!name || !Number.isFinite(min) || !Number.isFinite(max)) return errorResponse(c, 400, 'parameter, min_limit, and max_limit are required', 'PARAMS_BAD_REQUEST')

  const { data: existing } = await supabase.from('parameters').select('id').eq('name', name).maybeSingle()
  if (existing) return errorResponse(c, 400, 'Parameter already exists', 'PARAM_DUPLICATE')

  const displayName = String(payload?.display_name || name.replace(/_/g, ' ')).replace(/\b\w/g, (ch) => ch.toUpperCase())
  const unit = String(payload?.unit || '-').trim() || '-'
  const { data: created, error: cErr } = await supabase.from('parameters').insert({ name, display_name: displayName, unit, min_value: min, max_value: max, is_active: true }).select('id,name').single()
  if (cErr || !created) return errorResponse(c, 500, cErr?.message || 'Failed to create parameter', 'PARAM_CREATE_FAILED')

  const { data: std, error: sErr } = await supabase.from('standards').insert({ parameter_id: created.id, class: 'C', min_limit: min, max_limit: max, unit }).select('id,parameter_id,min_limit,max_limit').single()
  if (sErr || !std) return errorResponse(c, 500, sErr?.message || 'Failed to create standard', 'STANDARD_CREATE_FAILED')

  return c.json(toParameterPayload(created.name, std), 201)
})

admin.put('/api/parameters/:parameterName', authMiddleware, requireAdminRole, async (c) => {
  const supabase = c.get('supabase')
  const name = String(c.req.param('parameterName') || '').trim().toLowerCase()
  const { min_limit: min, max_limit: max } = await c.req.json()
  if (!name) return errorResponse(c, 400, 'Parameter name is required', 'PARAM_NAME_MISSING')
  if (!Number.isFinite(Number(min)) || !Number.isFinite(Number(max))) return errorResponse(c, 400, 'Missing min_limit or max_limit', 'PARAM_LIMITS_MISSING')

  const { data: row, error: rErr } = await supabase.from('parameters').select('id,name').eq('name', name).maybeSingle()
  if (rErr || !row) return errorResponse(c, 404, 'Parameter not found', 'PARAM_NOT_FOUND')

  const { data: updated, error: sErr } = await supabase.from('standards').update({ min_limit: Number(min), max_limit: Number(max), updated_at: new Date().toISOString() }).eq('parameter_id', row.id).eq('class', 'C').select('id,parameter_id,min_limit,max_limit').maybeSingle()
  if (sErr) return errorResponse(c, 500, sErr.message, 'STANDARD_UPDATE_FAILED')

  if (!updated) {
    const { data: ins, error: iErr } = await supabase.from('standards').insert({ parameter_id: row.id, class: 'C', min_limit: Number(min), max_limit: Number(max) }).select('id,parameter_id,min_limit,max_limit').single()
    if (iErr || !ins) return errorResponse(c, 500, iErr?.message || 'Failed to create standard', 'STANDARD_CREATE_FAILED')
    await supabase.from('parameters').update({ min_value: Number(min), max_value: Number(max), is_active: true, updated_at: new Date().toISOString() }).eq('id', row.id)
    return c.json(toParameterPayload(name, ins))
  }

  await supabase.from('parameters').update({ min_value: Number(min), max_value: Number(max), updated_at: new Date().toISOString() }).eq('id', row.id)
  return c.json(toParameterPayload(name, updated))
})

admin.delete('/api/parameters/:parameterName', authMiddleware, requireAdminRole, async (c) => {
  const supabase = c.get('supabase')
  const name = String(c.req.param('parameterName') || '').trim().toLowerCase()
  const CORE = new Set(['ph','cod','bod','tss','ammonia','nitrate','phosphate','temperature','flow'])
  if (!name) return errorResponse(c, 400, 'Parameter name is required', 'PARAM_NAME_MISSING')
  if (CORE.has(name)) return errorResponse(c, 400, 'Cannot delete core parameters', 'PARAM_CORE_PROTECTED')

  const { data: row, error: rErr } = await supabase.from('parameters').select('id,name').eq('name', name).maybeSingle()
  if (rErr || !row) return errorResponse(c, 404, 'Parameter not found', 'PARAM_NOT_FOUND')

  const { count, error: cErr } = await supabase.from('measurements').select('*', { count: 'exact', head: true }).eq('parameter_id', row.id)
  if (cErr) return errorResponse(c, 500, cErr.message, 'PARAM_COUNT_FAILED')
  if (Number(count || 0) > 0) return errorResponse(c, 400, 'Cannot delete parameter with existing measurements', 'PARAM_HAS_MEASUREMENTS')

  const { error: sdErr } = await supabase.from('standards').delete().eq('parameter_id', row.id)
  if (sdErr) return errorResponse(c, 500, sdErr.message, 'STANDARD_DELETE_FAILED')

  const { error: pdErr } = await supabase.from('parameters').delete().eq('id', row.id)
  if (pdErr) return errorResponse(c, 500, pdErr.message, 'PARAM_DELETE_FAILED')

  return c.json({ success: true })
})

// --- Data count & clear ---

admin.get('/api/data/count', authMiddleware, requireAdminRole, async (c) => {
  const supabase = c.get('supabase')
  const { count, error } = await supabase.from('measurements').select('*', { count: 'exact', head: true })
  if (error) return errorResponse(c, 500, error.message, 'DATA_COUNT_FAILED')
  const total = Number(count || 0)
  return c.json({ count: total, message: `Total measurements: ${total}` })
})

admin.delete('/api/data/clear', authMiddleware, requireAdminRole, async (c) => {
  const supabase = c.get('supabase')
  const { data: rows, error: rErr } = await supabase.from('measurements').select('id')
  if (rErr) return errorResponse(c, 500, rErr.message, 'DATA_CLEAR_READ_FAILED')
  const ids = (rows || []).map((r) => r.id)
  if (ids.length === 0) return c.json({ success: true, message: 'Deleted 0 measurements', count: 0 })
  const { error: dErr } = await supabase.from('measurements').delete().in('id', ids)
  if (dErr) return errorResponse(c, 500, dErr.message, 'DATA_CLEAR_FAILED')
  return c.json({ success: true, message: `Deleted ${ids.length} measurements`, count: ids.length })
})

admin.delete('/api/data/clear/:start/:end', authMiddleware, requireAdminRole, async (c) => {
  const supabase = c.get('supabase')
  const { start, end } = c.req.param()
  if (!start || !end) return errorResponse(c, 400, 'start and end date are required', 'DATA_CLEAR_RANGE_MISSING')
  const startIso = new Date(`${start}T00:00:00.000Z`).toISOString()
  const endIso = new Date(`${end}T23:59:59.999Z`).toISOString()
  const { data: rows, error: rErr } = await supabase.from('measurements').select('id').gte('timestamp', startIso).lte('timestamp', endIso)
  if (rErr) return errorResponse(c, 500, rErr.message, 'DATA_CLEAR_RANGE_READ_FAILED')
  const ids = (rows || []).map((r) => r.id)
  if (ids.length === 0) return c.json({ success: true, message: `Deleted 0 measurements from ${start} to ${end}`, count: 0 })
  const { error: dErr } = await supabase.from('measurements').delete().in('id', ids)
  if (dErr) return errorResponse(c, 500, dErr.message, 'DATA_CLEAR_RANGE_FAILED')
  return c.json({ success: true, message: `Deleted ${ids.length} measurements from ${start} to ${end}`, count: ids.length })
})

// --- Data import/export ---

admin.post('/api/data/import', authMiddleware, requireAdminRole, async (c) => {
  const EXPECTED = ['timestamp','ph','cod','bod','tss','ammonia','nitrate','phosphate','temperature','flow']
  let csvText = '', usedMultipart = false

  try {
    const form = await c.req.parseBody()
    const upload = form?.file
    if (upload && typeof upload !== 'string') {
      usedMultipart = true
      if (String(upload.name || '').toLowerCase().endsWith('.csv') === false && String(upload.name || '')) return errorResponse(c, 400, 'File must be CSV', 'IMPORT_NOT_CSV')
      csvText = await upload.text()
    }
  } catch { /* fall through */ }

  if (!csvText) { try { csvText = await c.req.text() } catch { csvText = '' } }
  if (!csvText || !csvText.toLowerCase().includes('timestamp,')) return errorResponse(c, 400, usedMultipart ? 'Invalid multipart form data' : 'CSV payload is required', 'IMPORT_NO_CSV')

  const rawLines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const headerIndex = rawLines.findIndex((l) => l.toLowerCase().startsWith('timestamp,'))
  if (headerIndex === -1 || headerIndex >= rawLines.length - 1) return errorResponse(c, 400, 'CSV must include a header and at least one data row', 'IMPORT_BAD_HEADER')

  const headers = rawLines[headerIndex].split(',').map((h) => h.trim().toLowerCase())
  const missing = EXPECTED.filter((k) => !headers.includes(k))
  if (missing.length > 0) return errorResponse(c, 400, `CSV missing required columns: ${missing.join(', ')}`, 'IMPORT_MISSING_COLUMNS')

  const supabase = c.get('supabase')
  const { data: params, error: pErr } = await supabase.from('parameters').select('id,name')
  if (pErr) return errorResponse(c, 500, pErr.message, 'IMPORT_PARAMS_FAILED')
  const paramMap = new Map((params || []).map((p) => [String(p.name || '').toLowerCase(), p.id]))
  const missingDb = EXPECTED.filter((k) => k !== 'timestamp' && !paramMap.has(k))
  if (missingDb.length > 0) return errorResponse(c, 400, `Parameters missing in DB: ${missingDb.join(', ')}`, 'IMPORT_MISSING_DB_PARAMS')

  const { data: plants, error: plErr } = await supabase.from('plants').select('id').order('name', { ascending: true }).limit(1)
  if (plErr) return errorResponse(c, 500, plErr.message, 'IMPORT_PLANTS_FAILED')
  if (!plants || plants.length === 0) return errorResponse(c, 400, 'No plants configured', 'IMPORT_NO_PLANTS')

  const plantId = plants[0].id
  const user = c.get('user')
  const rows = rawLines.slice(headerIndex + 1).map((l) => csvRowToObject(l, headers))
  const inserts = []

  for (const row of rows) {
    const tsCandidate = String(row.timestamp || '').trim()
    const parsedTs = tsCandidate ? new Date(tsCandidate) : null
    const timestamp = parsedTs && !Number.isNaN(parsedTs.getTime()) ? parsedTs.toISOString() : new Date().toISOString()
    for (const key of EXPECTED) {
      if (key === 'timestamp') continue
      const numeric = Number(String(row[key] || '').trim())
      if (!Number.isFinite(numeric)) continue
      inserts.push({ plant_id: plantId, parameter_id: paramMap.get(key), value: numeric, type: 'effluent', timestamp, operator_id: user.id })
    }
  }

  if (inserts.length === 0) return errorResponse(c, 400, 'No numeric values found in CSV', 'IMPORT_NO_VALUES')
  const { error: iErr } = await supabase.from('measurements').insert(inserts)
  if (iErr) return errorResponse(c, 500, iErr.message, 'IMPORT_INSERT_FAILED')

  return c.json({ success: true, imported_rows: rows.length, created_measurements: inserts.length, message: `Imported ${rows.length} rows, created ${inserts.length} records.` })
})

admin.get('/api/data/export', authMiddleware, requireAdminRole, async (c) => {
  if (c.req.query('format') === 'pdf') return errorResponse(c, 400, 'PDF export moved to /api/reports/pdf', 'EXPORT_USE_PDF_ENDPOINT')

  const supabase = c.get('supabase')
  const endDate = c.req.query('end') || new Date().toISOString().slice(0, 10)
  const startDate = c.req.query('start') || new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const startIso = new Date(`${startDate}T00:00:00.000Z`).toISOString()
  const endIso = new Date(`${endDate}T23:59:59.999Z`).toISOString()
  const ORDERED = ['ph','cod','bod','tss','ammonia','nitrate','phosphate','temperature','flow']

  const { data: params, error: pErr } = await supabase.from('parameters').select('id,name')
  if (pErr) return errorResponse(c, 500, pErr.message, 'EXPORT_PARAMS_FAILED')
  const nameById = new Map((params || []).map((p) => [p.id, String(p.name || '').toLowerCase()]))

  const { data: rows, error } = await supabase.from('measurements').select('timestamp,value,parameter_id').gte('timestamp', startIso).lte('timestamp', endIso).order('timestamp', { ascending: true }).limit(5000)
  if (error) return errorResponse(c, 500, error.message, 'EXPORT_FETCH_FAILED')

  const grouped = new Map()
  for (const item of rows || []) {
    const tk = String(item.timestamp || '')
    if (!grouped.has(tk)) grouped.set(tk, { timestamp: tk, ph:'',cod:'',bod:'',tss:'',ammonia:'',nitrate:'',phosphate:'',temperature:'',flow:'' })
    const name = nameById.get(item.parameter_id) || ''
    if (ORDERED.includes(name)) grouped.get(tk)[name] = item.value
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const csvLines = [`Wastewater Treatment Plant - Measurement Data`, `Report Period: ${startDate} to ${endDate}`, `Generated: ${now}`, `Max rows exported: 5000`, '', 'timestamp,ph,cod,bod,tss,ammonia,nitrate,phosphate,temperature,flow']
  for (const row of grouped.values()) {
    csvLines.push([row.timestamp, row.ph, row.cod, row.bod, row.tss, row.ammonia, row.nitrate, row.phosphate, row.temperature, row.flow].map(toCsvCell).join(','))
  }

  return new Response(`${csvLines.join('\n')}\n`, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="wastewater_data_${startDate}_to_${endDate}.csv"`, 'Cache-Control': 'no-store' } })
})

export default admin
