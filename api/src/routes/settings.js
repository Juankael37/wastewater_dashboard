/**
 * Settings routes — managing automated report recipients.
 */
import { Hono } from 'hono'
import { authMiddleware, requireAdminRole, errorResponse } from '../middleware.js'

const settings = new Hono()

// Get all report recipients
settings.get('/api/settings/reports', authMiddleware, requireAdminRole, async (c) => {
  const supabase = c.get('supabase')
  const { data, error } = await supabase
    .from('report_settings')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return errorResponse(c, 500, error.message, 'FETCH_REPORTS_FAILED')
  return c.json(data || [])
})

// Add a new recipient
settings.post('/api/settings/reports', authMiddleware, requireAdminRole, async (c) => {
  const supabase = c.get('supabase')
  const { email, frequency } = await c.req.json()

  if (!email) return errorResponse(c, 400, 'Email is required', 'MISSING_EMAIL')

  const { data, error } = await supabase
    .from('report_settings')
    .insert({ email, frequency: frequency || 'daily' })
    .select()
    .single()

  if (error) return errorResponse(c, 500, error.message, 'ADD_REPORT_FAILED')
  return c.json(data, 201)
})

// Toggle active status
settings.patch('/api/settings/reports/:id', authMiddleware, requireAdminRole, async (c) => {
  const supabase = c.get('supabase')
  const { id } = c.req.param()
  const { is_active } = await c.req.json()

  const { data, error } = await supabase
    .from('report_settings')
    .update({ is_active })
    .eq('id', id)
    .select()
    .single()

  if (error) return errorResponse(c, 500, error.message, 'UPDATE_REPORT_FAILED')
  return c.json(data)
})

// Delete a recipient
settings.delete('/api/settings/reports/:id', authMiddleware, requireAdminRole, async (c) => {
  const supabase = c.get('supabase')
  const { id } = c.req.param()

  const { error } = await supabase
    .from('report_settings')
    .delete()
    .eq('id', id)

  if (error) return errorResponse(c, 500, error.message, 'DELETE_REPORT_FAILED')
  return c.json({ success: true })
})

export default settings
