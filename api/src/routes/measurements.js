/**
 * Measurements, parameters, standards, and plants routes.
 */
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { authMiddleware, measurementSchema, errorResponse } from '../middleware.js'
import { appendMeasurementRow } from '../sheetsBackup.js'

const measurements = new Hono()

// --- Measurements CRUD ---

measurements.get('/measurements', authMiddleware, async (c) => {
  const supabase = c.get('supabase')
  const { plant_id, parameter_id, start_date, end_date, limit = 100 } = c.req.query()

  let query = supabase
    .from('measurements')
    .select('*, plants!inner(name, location), parameters!inner(name, display_name, unit)')
    .order('timestamp', { ascending: false })
    .limit(parseInt(limit, 10))

  if (plant_id) query = query.eq('plant_id', plant_id)
  if (parameter_id) query = query.eq('parameter_id', parameter_id)
  if (start_date) query = query.gte('timestamp', start_date)
  if (end_date) query = query.lte('timestamp', end_date)

  const { data, error } = await query
  if (error) return errorResponse(c, 500, error.message, 'MEASUREMENTS_FETCH_FAILED')

  return c.json({ data })
})

measurements.post('/measurements', authMiddleware, zValidator('json', measurementSchema), async (c) => {
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
    .select('id, plant_id, parameter_id, value, type, timestamp, operator_id, notes')
    .single()

  if (error) return errorResponse(c, 500, error.message, 'MEASUREMENT_CREATE_FAILED')

  const operatorEmail = user.email || ''
  const backupPromise = appendMeasurementRow(c.env, { measurement: data, operatorEmail })

  const exec = c.executionCtx
  if (exec?.waitUntil) {
    exec.waitUntil(backupPromise.catch((err) => console.error('[sheets] backup error', err)))
  } else {
    await backupPromise.catch((err) => console.error('[sheets] backup error', err))
  }

  return c.json({ data }, 201)
})

measurements.get('/measurements/:id', authMiddleware, async (c) => {
  const supabase = c.get('supabase')
  const { id } = c.req.param()

  const { data, error } = await supabase
    .from('measurements')
    .select('*, plants!inner(*), parameters!inner(*)')
    .eq('id', id)
    .single()

  if (error) return errorResponse(c, 404, error.message, 'MEASUREMENT_NOT_FOUND')

  return c.json({ data })
})

// --- Parameters ---

measurements.get('/parameters', authMiddleware, async (c) => {
  const supabase = c.get('supabase')
  const { active } = c.req.query()

  let query = supabase.from('parameters').select('*').order('name')
  if (active !== undefined) query = query.eq('is_active', active === 'true')

  const { data, error } = await query
  if (error) return errorResponse(c, 500, error.message, 'PARAMETERS_FETCH_FAILED')

  return c.json({ data })
})

// --- Standards ---

measurements.get('/standards', authMiddleware, async (c) => {
  const supabase = c.get('supabase')
  const { class: standardClass } = c.req.query()

  let query = supabase.from('standards').select('*, parameters!inner(*)').order('parameter_id')
  if (standardClass) query = query.eq('class', standardClass)

  const { data, error } = await query
  if (error) return errorResponse(c, 500, error.message, 'STANDARDS_FETCH_FAILED')

  return c.json({ data })
})

// --- Plants ---

measurements.get('/plants', authMiddleware, async (c) => {
  const supabase = c.get('supabase')

  const { data, error } = await supabase.from('plants').select('*').order('name')
  if (error) return errorResponse(c, 500, error.message, 'PLANTS_FETCH_FAILED')

  return c.json({ data })
})

// --- Validation ---

measurements.post('/api/validation/check', authMiddleware, async (c) => {
  const supabase = c.get('supabase')
  const payload = await c.req.json()
  const value = Number(payload?.value)
  const parameterId = payload?.parameter_id

  if (!Number.isFinite(value) || !parameterId) {
    return errorResponse(c, 400, 'parameter_id and numeric value are required', 'VALIDATION_BAD_REQUEST')
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

export default measurements
