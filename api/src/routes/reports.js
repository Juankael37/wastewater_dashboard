/**
 * Reports routes — summary, performance, daily, PDF.
 */
import { Hono } from 'hono'
import { authMiddleware, errorResponse, buildFormattedPdfBuffer } from '../middleware.js'

const reports = new Hono()

reports.get('/api/reports/summary', authMiddleware, async (c) => {
  const supabase = c.get('supabase')
  const now = new Date()
  const start = c.req.query('start') || new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const end = c.req.query('end') || now.toISOString()

  const { data, error } = await supabase.from('measurements')
    .select('id,value,timestamp,parameter_id,parameters!inner(name),alerts(id,resolved)')
    .gte('timestamp', start).lte('timestamp', end)
  if (error) return errorResponse(c, 500, error.message, 'REPORT_SUMMARY_FAILED')

  const rows = data || []
  const byParam = new Map()
  let compliant = 0
  const { data: standards } = await supabase.from('standards').select('parameter_id,min_limit,max_limit').eq('class', 'C')
  const stdMap = new Map((standards || []).map((s) => [s.parameter_id, s]))

  for (const row of rows) {
    const pname = row.parameters?.name || 'unknown'
    if (!byParam.has(pname)) byParam.set(pname, { compliant: 0, total: 0 })
    const stat = byParam.get(pname)
    stat.total += 1
    const std = stdMap.get(row.parameter_id)
    if (std && Number(row.value) >= Number(std.min_limit) && Number(row.value) <= Number(std.max_limit)) { stat.compliant += 1; compliant += 1 }
  }

  const activeAlerts = rows.reduce((a, r) => a + (Array.isArray(r.alerts) ? r.alerts : []).filter((x) => !x.resolved).length, 0)
  return c.json({ count: rows.length, parameters: Object.fromEntries(byParam), compliance_rate: rows.length > 0 ? Number(((compliant / rows.length) * 100).toFixed(2)) : 100, alerts: activeAlerts })
})

reports.get('/api/reports/performance', authMiddleware, async (c) => {
  const supabase = c.get('supabase')
  const days = parseInt(c.req.query('days') || '30', 10)
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const { data, error } = await supabase.from('measurements').select('id,timestamp').gte('timestamp', since)
  if (error) return errorResponse(c, 500, error.message, 'REPORT_PERF_FAILED')
  const rows = data || []
  const daily = new Map()
  for (const r of rows) { const d = String(r.timestamp).slice(0, 10); daily.set(d, (daily.get(d) || 0) + 1) }
  return c.json({ period_days: days, total_measurements: rows.length, avg_daily_measurements: Number((daily.size > 0 ? rows.length / daily.size : 0).toFixed(2)), compliance_trend: 'stable', alert_frequency: 0, days_with_data: daily.size })
})

reports.get('/api/reports/daily', authMiddleware, async (c) => {
  const supabase = c.get('supabase')
  const since = new Date(Date.now() - 86400000).toISOString()
  const { data, error } = await supabase.from('measurements').select('id,timestamp').gte('timestamp', since)
  if (error) return errorResponse(c, 500, error.message, 'REPORT_DAILY_FAILED')
  return c.json({ date: new Date().toISOString().slice(0, 10), measurement_count: (data || []).length, compliance_rate: 100, alerts: 0, parameters: {}, summary: `Daily report: ${(data || []).length} measurements.` })
})

reports.get('/api/reports/pdf', authMiddleware, async (c) => {
  const supabase = c.get('supabase')
  const now = new Date()
  const startParam = c.req.query('start')
  const endParam = c.req.query('end')
  
  // Handle date strings - convert "2026-04-28" to "2026-04-28T00:00:00Z"
  const start = startParam ? startParam + 'T00:00:00Z' : new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const end = endParam ? endParam + 'T23:59:59Z' : now.toISOString()
  
  const selectedSet = new Set((c.req.query('parameters') || '').split(',').map((p) => p.trim().toLowerCase()).filter(Boolean))

  const { data, error } = await supabase.from('measurements')
    .select('value,type,timestamp,parameters!inner(name,display_name,unit),plants!inner(name)')
    .gte('timestamp', start).lte('timestamp', end).order('timestamp', { ascending: false }).limit(1500)
  if (error) return errorResponse(c, 500, error.message, 'REPORT_PDF_FAILED')

  const filtered = (data || []).filter((r) => selectedSet.size === 0 || selectedSet.has(String(r.parameters?.name || '').toLowerCase()))
  const hs = String(start).slice(0, 10), he = String(end).slice(0, 10)

  const paramStatsMap = new Map()
  const rawDataList = []
  
  for (const row of filtered) {
    const p = row.parameters?.display_name || row.parameters?.name || 'Unknown'
    const unit = row.parameters?.unit || ''
    const v = Number(row.value)
    rawDataList.push({ timestamp: row.timestamp, parameter: p, value: v, unit })
    
    if (!paramStatsMap.has(p)) {
      paramStatsMap.set(p, { name: p, latest: v, min: v, max: v, sum: v, count: 1, recent: [v], unit })
    } else {
      const stat = paramStatsMap.get(p)
      stat.latest = v
      stat.min = Math.min(stat.min, v)
      stat.max = Math.max(stat.max, v)
      stat.sum += v
      stat.count += 1
      stat.recent.push(v)
    }
  }
  
  const parameterStats = []
  for (const [, stat] of paramStatsMap) {
    parameterStats.push({
      name: stat.name,
      latest: stat.latest,
      min: stat.min,
      max: stat.max,
      avg: stat.count > 0 ? stat.sum / stat.count : 0,
      recent: stat.recent.slice(-10),
      unit: stat.unit
    })
  }
  
  const summary = {
    'Total Measurements': rawDataList.length,
    'Date Range': `${hs} to ${he}`,
    'Parameters Tracked': paramStatsMap.size
  }

  const pdfBytes = buildFormattedPdfBuffer({
    title: 'Wastewater Monitoring Report',
    subtitle: selectedSet.size > 0 ? `Filtered: ${[...selectedSet].join(', ')}` : 'All Parameters',
    dateRange: `${hs} to ${he}`,
    generatedAt: now.toISOString(),
    summary,
    parameterStats,
    rawData: rawDataList,
    maxRawRows: 300
  })
  
  return new Response(pdfBytes, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="wastewater_report_${hs}_to_${he}.pdf"`, 'Cache-Control': 'no-store' } })
})

export default reports
