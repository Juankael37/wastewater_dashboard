/**
 * Alerts routes — list, dashboard summary, resolve.
 */
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { authMiddleware, requireAdminRole, alertResolveSchema, errorResponse } from '../middleware.js'

const alerts = new Hono()

alerts.get('/alerts', authMiddleware, async (c) => {
  const supabase = c.get('supabase')
  const { resolved, limit = 50 } = c.req.query()

  let query = supabase
    .from('alerts')
    .select('*, measurements!inner(*, plants!inner(*), parameters!inner(*))')
    .order('created_at', { ascending: false })
    .limit(parseInt(limit, 10))

  if (resolved !== undefined) {
    query = query.eq('resolved', resolved === 'true')
  }

  const { data, error } = await query
  if (error) return errorResponse(c, 500, error.message, 'ALERTS_FETCH_FAILED')

  return c.json({ data })
})

alerts.get('/api/alerts/dashboard', authMiddleware, async (c) => {
  const supabase = c.get('supabase')
  const { data, error } = await supabase
    .from('alerts')
    .select(`
      id, resolved, resolved_at, created_at, severity,
      measurements!inner(
        id, value, timestamp,
        plants!inner(name),
        parameters!inner(name, display_name)
      )
    `)
    .eq('resolved', false)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return errorResponse(c, 500, error.message, 'ALERTS_DASHBOARD_FAILED')

  const alertRows = (data || []).map((item) => {
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

  const critical = alertRows.filter((a) => a.severity === 'critical').length
  const warning = alertRows.filter((a) => a.severity === 'warning').length

  return c.json({
    total: alertRows.length,
    critical,
    warning,
    alerts: alertRows.slice(0, 10),
  })
})

alerts.patch('/alerts/:id/resolve', authMiddleware, requireAdminRole, zValidator('json', alertResolveSchema), async (c) => {
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

  if (error) return errorResponse(c, 500, error.message, 'ALERT_RESOLVE_FAILED')

  return c.json({ data })
})

export default alerts
