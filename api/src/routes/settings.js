/**
 * Settings routes — managing automated report recipients.
 */
import { Hono } from 'hono'
import { authMiddleware, requireAdminRole, errorResponse, createServiceClient, buildFormattedPdfBuffer } from '../middleware.js'
import { buildRichPdfBuffer } from './richPdf.js'
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
  const { email, frequency, send_time, day_of_week, day_of_month } = await c.req.json()

  if (!email) return errorResponse(c, 400, 'Email is required', 'MISSING_EMAIL')

  const insertData = { 
    email, 
    frequency: frequency || 'daily'
  }
  
  if (send_time) insertData.send_time = send_time
  if (frequency === 'weekly' && day_of_week) insertData.day_of_week = day_of_week
  if (frequency === 'monthly' && day_of_month) insertData.day_of_month = day_of_month

  const { data, error } = await supabase
    .from('report_settings')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('Insert report_settings error:', error)
    return errorResponse(c, 500, error.message, 'ADD_REPORT_FAILED')
  }
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
    const plantName = plants?.[0]?.name || 'Wastewater Treatment Plant'
    
    const htmlContent = await generateReportHtml(supabase, plantName, 'daily')

    const today = new Date();
    const dayOfWeek = today.getDay();

    // Date ranges
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dailyStart = yesterday.toISOString().slice(0, 10);
    const dailyEnd = dailyStart;

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - (dayOfWeek === 0 ? 7 : dayOfWeek - 1) - 7 + dayOfWeek);
    const weekStartDate = new Date(weekStart);
    const weekEnd = new Date(weekStartDate);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weeklyStart = weekStartDate.toISOString().slice(0, 10);
    const weeklyEnd = weekEnd.toISOString().slice(0, 10);

    const monthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    const monthlyStart = monthStart.toISOString().slice(0, 10);
    const monthlyEnd = monthEnd.toISOString().slice(0, 10);

    const dateRanges = {
      daily: { start: dailyStart, end: dailyEnd, label: dailyStart },
      weekly: { start: weeklyStart, end: weeklyEnd, label: `${weeklyStart} to ${weeklyEnd}` },
      monthly: { start: monthlyStart, end: monthlyEnd, label: `${monthStart.toLocaleString('en-US', { month: 'long' })} ${monthStart.getFullYear()}` }
    };

    let sentCount = 0;
    for (const r of recipients) {
      const freq = r.frequency;
      const range = dateRanges[freq];
      if (!range) continue;

      console.log(`Building professional PDF for ${freq} (${range.start} to ${range.end})...`);

      try {
        const pdfBytes = await buildRichPdfBuffer(c.env, supabase, {
          startDate: range.start,
          endDate: range.end,
          title: plantName
        });

        let binary = '';
        for (let i = 0; i < pdfBytes.length; i++) {
          binary += String.fromCharCode(pdfBytes[i]);
        }
        const pdfBase64 = btoa(binary);

        const attachments = [{
          filename: `AquaDash_${freq}_report_${range.start}_${range.end}.pdf`,
          content: pdfBase64
        }];

        const subject = `[TEST] ${freq.charAt(0).toUpperCase() + freq.slice(1)} Wastewater Report - ${range.label}`;

        await sendEmailViaResend(c.env, {
          to: r.email,
          subject,
          htmlContent,
          attachments
        });
        sentCount++;
        console.log(`Sent ${freq} report to ${r.email}`);
      } catch (pdfErr) {
        console.error(`PDF/send failed for ${r.email}: ${pdfErr.message}`);
      }
    }

    return c.json({ success: true, message: `Test report sent to ${sentCount} recipients` })
  } catch (error) {
    return errorResponse(c, 500, error.message, 'TEST_REPORT_FAILED')
  }
})

export default settings
