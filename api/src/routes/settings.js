/**
 * Settings routes — managing automated report recipients.
 */
import { Hono } from 'hono'
import { authMiddleware, requireAdminRole, errorResponse, createServiceClient, buildSimplePdfBuffer } from '../middleware.js'
import { generateReportHtml, sendEmailViaResend } from '../emailService.js'

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

// Debug endpoint — temporarily public for troubleshooting
settings.get('/api/settings/debug', async (c) => {
  const key = c.env.RESEND_API_KEY?.trim() ?? ''
  return c.json({
    resend_key_set: key.length > 0,
    resend_key_prefix: key.length > 4 ? key.slice(0, 4) + '...' : '(empty)',
    resend_key_length: key.length,
    service_role_key_set: Boolean(c.env.SUPABASE_SERVICE_ROLE_KEY),
  })
})

// trigger a manual test report
settings.post('/api/settings/reports/test', authMiddleware, requireAdminRole, async (c) => {
  const supabase = createServiceClient(c.env) || c.get('supabase')
  
  try {
    const { data: recipients } = await supabase
      .from('report_settings')
      .select('email, frequency')
      .eq('is_active', true)
    
    if (!recipients || recipients.length === 0) {
      return errorResponse(c, 400, 'No active recipients found', 'NO_RECIPIENTS')
    }

    const { data: plants } = await supabase.from('plants').select('name').limit(1)
    const plantName = plants?.[0]?.name || 'Wastewater Plant'
    
    const freqGroups = { daily: [], weekly: [], monthly: [] };
    for (const r of recipients) {
      if (freqGroups[r.frequency]) freqGroups[r.frequency].push(r.email);
    }

    for (const freq of Object.keys(freqGroups)) {
      const emails = freqGroups[freq];
      if (emails.length === 0) continue;

      const htmlContent = await generateReportHtml(supabase, plantName, freq)

      // Build simple PDF
      let daysAgo = 1;
      if (freq === 'weekly') daysAgo = 7;
      if (freq === 'monthly') daysAgo = 30;
      const since = new Date(Date.now() - daysAgo * 86400000).toISOString();
      const { data: rawMs } = await supabase.from('measurements')
        .select('value,type,timestamp,parameters!inner(name,display_name,unit),plants!inner(name)')
        .gte('timestamp', since).order('timestamp', { ascending: false }).limit(500);

      const lines = ['Wastewater Monitoring Raw Data Report', `Period: Last ${daysAgo} day(s)`, `Generated: ${new Date().toISOString()}`, '------------------------------------------------------------'];
      for (const row of (rawMs || [])) {
        const p = row.parameters?.display_name || row.parameters?.name || 'Unknown';
        const v = Number(row.value);
        lines.push(`${String(row.timestamp || '').replace('T', ' ').slice(0, 19)} | ${p} ${Number.isFinite(v) ? v : '-'} ${row.parameters?.unit || ''} | ${row.type || 'effluent'}`);
      }
      
      const pdfBytes = buildSimplePdfBuffer(lines);
      let binary = '';
      for (let i = 0; i < pdfBytes.length; i++) {
          binary += String.fromCharCode(pdfBytes[i]);
      }
      const pdfBase64 = btoa(binary);

      const attachments = [{
        filename: `AquaDash_${freq}_report.pdf`,
        content: pdfBase64
      }];

      for (const email of emails) {
        await sendEmailViaResend(c.env, {
          to: email,
          subject: `[TEST] AquaDash ${freq.charAt(0).toUpperCase() + freq.slice(1)} Report - ${plantName}`,
          htmlContent,
          attachments
        })
      }
    }

    return c.json({ success: true, message: `Test report sent to ${recipients.length} recipients` })
  } catch (error) {
    return errorResponse(c, 500, error.message, 'TEST_REPORT_FAILED')
  }
})

export default settings
