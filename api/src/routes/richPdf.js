/**
 * Rich PDF Report v5 — Professional layout with charts, tables & images.
 * Uses pdf-lib (edge-compatible, no Node.js APIs).
 */
import { Hono } from 'hono'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { authMiddleware } from '../middleware.js'
import {
  CLR, safe, drawBarChart, drawTable, drawSectionHeading,
  drawStatCard, addFooters, fetchImageBytes, getImageFormat, embedImages,
  embedLogo,
} from './pdfHelpers.js'

const richPdf = new Hono()

// ── Data fetching ──────────────────────────────────────────────────────────
async function fetchReportData(supabase, startDate, endDate, requestedParams) {
  const [mRes, pRes, sRes] = await Promise.all([
    supabase.from('measurements').select('*, parameters!inner(id, name, display_name, unit)')
      .gte('timestamp', startDate + 'T00:00:00Z').lte('timestamp', endDate + 'T23:59:59Z')
      .order('timestamp', { ascending: true }).limit(500),
    supabase.from('parameters').select('id, name, display_name, unit').order('name'),
    supabase.from('standards').select('parameter_id, min_limit, max_limit').eq('class', 'C'),
  ])

  const measurements = mRes.data || []
  const allParameters = pRes.data || []
  const standards = sRes.data || []
  const stdMap = new Map(standards.map(s => [s.parameter_id, s]))

  const paramConfigs = {}
  for (const p of allParameters) {
    paramConfigs[p.name.toLowerCase()] = {
      id: p.id, display: p.display_name || p.name,
      unit: p.unit || '', standard: stdMap.get(p.id) || null,
    }
  }

  const filtered = measurements.filter(m => {
    if (!requestedParams || requestedParams.length === 0) return true
    return requestedParams.some(rp => rp.toLowerCase() === m.parameters?.name?.toLowerCase())
  })

  // Build per-parameter chart data + table rows
  const paramData = {}
  const tableRows = []

  for (const m of filtered) {
    const pName = m.parameters?.name?.toLowerCase() || 'unknown'
    const pId = m.parameters?.id
    if (!paramData[pName]) {
      paramData[pName] = {
        influent: { labels: [], values: [] },
        effluent: { labels: [], values: [] },
        config: paramConfigs[pName] || { id: pId, display: pName, unit: '', standard: stdMap.get(pId) || null },
      }
    }
    const type = m.type === 'effluent' ? 'effluent' : 'influent'
    if (paramData[pName][type].values.length < 20) {
      const d = new Date(m.timestamp)
      const lbl = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
        d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0')
      paramData[pName][type].labels.push(lbl)
      paramData[pName][type].values.push(Number(m.value))
    }

    let status = 'N/A'
    if (type === 'effluent') {
      const std = paramData[pName].config.standard
      if (std) {
        const val = Number(m.value)
        status = ((std.min_limit === null || val >= std.min_limit) && (std.max_limit === null || val <= std.max_limit)) ? 'PASS' : 'FAIL'
      } else { status = 'NO STD' }
    }

    tableRows.push({
      date: new Date(m.timestamp).toLocaleString(),
      param: m.parameters?.display_name || m.parameters?.name || '',
      type: m.type || '', value: m.value, unit: m.parameters?.unit || '',
      status, notes: m.notes,
    })
  }

  // Extract image URLs from notes JSON
  const imageEntries = [], seenUrls = new Set()
  let notesChecked = 0, notesWithImages = 0
  for (const row of tableRows) {
    let obj = null
    if (typeof row.notes === 'object' && row.notes) obj = row.notes
    else if (typeof row.notes === 'string' && row.notes.trim().startsWith('{')) {
      try { obj = JSON.parse(row.notes) } catch {}
    }
    if (obj) notesChecked++
    if (obj?.images && typeof obj.images === 'object') {
      notesWithImages++
      for (const [param, url] of Object.entries(obj.images)) {
        if (url && typeof url === 'string' && !seenUrls.has(url)) {
          seenUrls.add(url); imageEntries.push({ param, url })
        }
      }
    }
  }
  console.log(`[pdf] Notes: ${tableRows.length} rows, ${notesChecked} with JSON, ${notesWithImages} with images, ${imageEntries.length} unique URLs`)
  if (imageEntries.length > 0) {
    console.log(`[pdf] Image URLs found:`, imageEntries.map(e => `${e.param}: ${e.url.slice(0, 80)}...`))
  }

  return { paramData, tableRows, standards, paramConfigs, imageEntries }
}

// ── Main PDF builder ───────────────────────────────────────────────────────
async function generatePdfBytes(supabase, options, env = null) {
  const { startDate, endDate, parameters: requestedParams, title = 'Wastewater Treatment Plant' } = options
  const { paramData, tableRows, standards, paramConfigs, imageEntries } = await fetchReportData(supabase, startDate, endDate, requestedParams)

  const pdfDoc = await PDFDocument.create()
  const reg = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fonts = { reg, bold }

  const W = 595.28, H = 841.89, M = 45, CW = W - 2 * M
  const allPages = []
  let page, y

  function newPage() { page = pdfDoc.addPage([W, H]); allPages.push(page); y = H - M; return page }
  function need(h) { if (y - h < M + 45) newPage() }

  // ────────────────────────────────────────────────────────────────────────
  // PAGE 1: Cover
  // ────────────────────────────────────────────────────────────────────────
  newPage()

  // Header banner (gradient effect with layered rectangles)
  page.drawRectangle({ x: 0, y: H - 110, width: W, height: 110, color: CLR.primary })
  page.drawRectangle({ x: 0, y: H - 110, width: W, height: 4, color: CLR.primaryLt })
  
  // Embed Wil-C logo
  const logoImage = await embedLogo(pdfDoc, env)
  if (logoImage) {
    const logoW = 80, logoH = Math.min((logoImage.height / logoImage.width) * logoW, 90)
    page.drawImage(logoImage, { x: M, y: H - 55 - logoH / 2, width: logoW, height: logoH })
    page.drawText('Wil-C', { x: M + logoW + 15, y: H - 45, size: 18, font: bold, color: CLR.white })
    page.drawText(safe(title), { x: M + logoW + 15, y: H - 65, size: 11, font: reg, color: rgb(0.75, 0.82, 0.95) })
  } else {
    page.drawText('Wil-C', { x: M, y: H - 45, size: 22, font: bold, color: CLR.white })
    page.drawText(safe(title), { x: M, y: H - 65, size: 12, font: reg, color: rgb(0.75, 0.82, 0.95) })
  }
  page.drawText('v5.0', { x: W - M - 28, y: H - 50, size: 9, font: bold, color: rgb(0.6, 0.72, 0.92) })
  y = H - 130

  // Info cards row — give REPORT PERIOD a wider card so dates fit
  const gap = 7
  const periodW = Math.round((CW - gap * 3) * 0.38)  // ~38% width for the date range card
  const smallW = Math.round((CW - gap * 3 - periodW) / 3)
  const complianceRate = tableRows.length > 0
    ? Math.round(tableRows.filter(r => r.status === 'PASS').length / tableRows.filter(r => r.status !== 'N/A').length * 100) || 0 : 100

  // Format dates compactly: "May 13 - May 19, 2026"
  const fmtD = (d) => { const dt = new Date(d + 'T00:00:00Z'); return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
  const endYear = new Date(endDate + 'T00:00:00Z').getFullYear()
  const periodStr = `${fmtD(startDate)} - ${fmtD(endDate)}, ${endYear}`

  let cx = M
  drawStatCard(page, 'REPORT PERIOD', periodStr, cx, y, periodW, fonts); cx += periodW + gap
  drawStatCard(page, 'TOTAL RECORDS', String(tableRows.length), cx, y, smallW, fonts); cx += smallW + gap
  drawStatCard(page, 'COMPLIANCE', `${complianceRate}%`, cx, y, smallW, fonts, complianceRate >= 80 ? CLR.pass : CLR.fail); cx += smallW + gap
  drawStatCard(page, 'GENERATED', new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), cx, y, smallW, fonts)
  y -= 60

  // ── Parameter Overview Table ──────────────────────────────────────────
  if (Object.keys(paramData).length > 0) {
    y = drawSectionHeading(page, 'Parameter Overview', M, y, CW, fonts)
    const overviewHeaders = ['Parameter', 'Unit', 'Influent Avg', 'Effluent Avg', 'Std Limit', 'Status']
    const overviewWidths = [110, 50, 80, 80, 80, 80]
    const overviewRows = []

    for (const [, data] of Object.entries(paramData)) {
      const infVals = data.influent.values, effVals = data.effluent.values
      const infAvg = infVals.length > 0 ? (infVals.reduce((a, b) => a + b, 0) / infVals.length).toFixed(2) : '-'
      const effAvg = effVals.length > 0 ? (effVals.reduce((a, b) => a + b, 0) / effVals.length).toFixed(2) : '-'
      const std = data.config.standard
      const limitStr = std ? (std.min_limit !== null && std.max_limit !== null ? `${std.min_limit} - ${std.max_limit}` : std.max_limit !== null ? `<= ${std.max_limit}` : `>= ${std.min_limit}`) : '-'
      let status = '-'
      if (effVals.length > 0 && std?.max_limit !== null && std?.max_limit !== undefined) {
        status = Number(effAvg) <= std.max_limit ? 'PASS' : 'FAIL'
      }
      overviewRows.push([data.config.display, data.config.unit, infAvg, effAvg, limitStr, status])
    }
    y = drawTable(page, overviewHeaders, overviewRows, overviewWidths, fonts, { x: M, startY: y })
    y -= 20
  }

  // ── Effluent Standards Reference ──────────────────────────────────────
  if (standards && standards.length > 0) {
    need(120)
    y = drawSectionHeading(page, 'Effluent Standards (Class C)', M, y, CW, fonts)
    const stdHeaders = ['Parameter', 'Min Limit', 'Max Limit', 'Unit']
    const stdWidths = [180, 100, 100, 100]
    const stdRows = []
    for (const std of standards) {
      const pc = Object.values(paramConfigs).find(p => p.id === std.parameter_id)
      if (!pc) continue
      stdRows.push([pc.display, std.min_limit !== null ? String(std.min_limit) : '-', std.max_limit !== null ? String(std.max_limit) : '-', pc.unit])
    }
    y = drawTable(page, stdHeaders, stdRows, stdWidths, fonts, { x: M, startY: y })
    y -= 20
  }

  // ────────────────────────────────────────────────────────────────────────
  // PARAMETER DETAIL PAGES: Chart + mini table per parameter
  // ────────────────────────────────────────────────────────────────────────
  for (const [key, data] of Object.entries(paramData)) {
    const hasData = data.influent.values.length > 0 || data.effluent.values.length > 0
    if (!hasData) continue

    newPage() // Each parameter gets its own page

    // Parameter heading
    y = drawSectionHeading(page, `${data.config.display} (${data.config.unit})`, M, y, CW, fonts)

    // Summary stat cards
    const infVals = data.influent.values, effVals = data.effluent.values
    const sCardW = (CW - 30) / 5
    const allVals = [...infVals, ...effVals]
    const avg = allVals.length > 0 ? (allVals.reduce((a, b) => a + b, 0) / allVals.length).toFixed(2) : '-'
    const mn = allVals.length > 0 ? Math.min(...allVals).toFixed(2) : '-'
    const mx = allVals.length > 0 ? Math.max(...allVals).toFixed(2) : '-'
    const stdLim = data.config.standard?.max_limit
    const statusTxt = effVals.length > 0 && stdLim != null ? (effVals.every(v => v <= stdLim) ? 'PASS' : 'FAIL') : 'N/A'

    drawStatCard(page, 'AVERAGE', avg, M, y, sCardW, fonts)
    drawStatCard(page, 'MIN', mn, M + (sCardW + 8) * 1, y, sCardW, fonts)
    drawStatCard(page, 'MAX', mx, M + (sCardW + 8) * 2, y, sCardW, fonts)
    drawStatCard(page, 'STD LIMIT', stdLim != null ? `<= ${stdLim}` : '-', M + (sCardW + 8) * 3, y, sCardW, fonts)
    drawStatCard(page, 'STATUS', statusTxt, M + (sCardW + 8) * 4, y, sCardW, fonts, statusTxt === 'PASS' ? CLR.pass : statusTxt === 'FAIL' ? CLR.fail : CLR.text)
    y -= 60

    // Bar chart
    const chartH = 200
    drawBarChart(page, data, fonts, { x: M, y: y - chartH, width: CW, height: chartH })
    y -= chartH + 25

    // Recent values mini-table
    need(100)
    page.drawText('Recent Measurements', { x: M, y, size: 10, font: bold, color: CLR.text })
    y -= 14
    const miniHeaders = ['Date/Time', 'Type', 'Value', 'Unit']
    const miniWidths = [200, 80, 100, 100]
    const miniRows = []
    const combined = [
      ...infVals.map((v, i) => ({ label: data.influent.labels[i], type: 'influent', value: v })),
      ...effVals.map((v, i) => ({ label: data.effluent.labels[i], type: 'effluent', value: v })),
    ].slice(-10)
    for (const item of combined) {
      miniRows.push([item.label, item.type, String(item.value), data.config.unit])
    }
    if (miniRows.length > 0) {
      y = drawTable(page, miniHeaders, miniRows, miniWidths, fonts, { x: M, startY: y })
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // FULL MEASUREMENT DATA TABLE
  // ────────────────────────────────────────────────────────────────────────
  if (tableRows.length > 0) {
    newPage()
    y = drawSectionHeading(page, `Measurement Data (${Math.min(tableRows.length, 50)} Records)`, M, y, CW, fonts)

    const dataHeaders = ['Date', 'Parameter', 'Type', 'Value', 'Unit', 'Status']
    const dataWidths = [130, 105, 60, 65, 55, 65]

    // Draw header
    page.drawRectangle({ x: M, y: y - 16, width: CW, height: 16, color: CLR.tblHead })
    let cx = M + 5
    dataHeaders.forEach((h, i) => {
      page.drawText(safe(h), { x: cx, y: y - 13, size: 7.5, font: bold, color: CLR.white })
      cx += dataWidths[i]
    })
    y -= 16

    const displayRows = tableRows.slice(0, 50)
    for (let r = 0; r < displayRows.length; r++) {
      if (y - 15 < M + 45) {
        newPage()
        // Re-draw header on new page
        page.drawRectangle({ x: M, y: y - 16, width: CW, height: 16, color: CLR.tblHead })
        cx = M + 5
        dataHeaders.forEach((h, i) => {
          page.drawText(safe(h), { x: cx, y: y - 13, size: 7.5, font: bold, color: CLR.white })
          cx += dataWidths[i]
        })
        y -= 16
      }

      const row = displayRows[r]
      const rowColor = r % 2 === 0 ? CLR.rowAlt : CLR.rowWhite
      page.drawRectangle({ x: M, y: y - 15, width: CW, height: 15, color: rowColor })
      page.drawLine({ start: { x: M, y: y - 15 }, end: { x: M + CW, y: y - 15 }, thickness: 0.3, color: CLR.border })

      cx = M + 5
      const cells = [
        row.date.slice(0, 18), String(row.param).slice(0, 22), row.type,
        String(row.value), row.unit, row.status
      ]
      cells.forEach((cell, i) => {
        let color = CLR.text
        const s = safe(cell)
        if (s === 'PASS') color = CLR.pass
        else if (s === 'FAIL') color = CLR.fail
        else if (s === 'influent') color = CLR.influent
        else if (s === 'effluent') color = CLR.effluent
        const f = (i === 5 || s === 'PASS' || s === 'FAIL') ? bold : reg
        page.drawText(s, { x: cx, y: y - 12, size: 7, font: f, color })
        cx += dataWidths[i]
      })
      y -= 15
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // FIELD PHOTOGRAPHS
  // ────────────────────────────────────────────────────────────────────────
  if (imageEntries.length > 0) {
    newPage()
    y = drawSectionHeading(page, 'Field Photographs', M, y, CW, fonts)

    const embeddedImages = await embedImages(pdfDoc, imageEntries, 8)
    if (embeddedImages.length > 0) {
      const imgW = (CW - 15) / 2, imgH = 140
      let xOff = M
      for (let i = 0; i < embeddedImages.length; i++) {
        const { image, param } = embeddedImages[i]
        const scale = Math.min(imgW / image.width, imgH / image.height)
        const sw = image.width * scale, sh = image.height * scale

        need(sh + 40)
        page.drawRectangle({ x: xOff, y: y - sh - 22, width: sw + 10, height: sh + 28, color: CLR.chartBg, borderColor: CLR.border, borderWidth: 0.5 })
        page.drawImage(image, { x: xOff + 5, y: y - sh - 16, width: sw, height: sh })
        page.drawText(safe(param), { x: xOff + 5, y: y - sh - 32, size: 8, font: bold, color: CLR.primary })

        if (i % 2 === 0) { xOff = M + imgW + 15 }
        else { xOff = M; y -= imgH + 40 }
      }
      if (embeddedImages.length % 2 === 1) y -= imgH + 40
    } else {
      page.drawText('Could not load image attachments', { x: M, y: y - 14, size: 9, font: reg, color: CLR.textSec })
    }
  }

  // ── Footers on all pages ──────────────────────────────────────────────
  addFooters(allPages, fonts, W, M)

  return await pdfDoc.save()
}

// ── Route handler ──────────────────────────────────────────────────────────
richPdf.post('/api/reports/rich-pdf', authMiddleware, async (c) => {
  let body
  try { body = await c.req.json() } catch { body = {} }
  const { start, end, parameters: requestedParams } = body
  const supabase = c.get('supabase')
  const startDate = start || new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const endDate = end || new Date().toISOString().slice(0, 10)

  try {
    const pdfBytes = await generatePdfBytes(supabase, { startDate, endDate, parameters: requestedParams, title: 'Wastewater Treatment Plant' }, c.env)
    return new Response(pdfBytes, {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="wastewater_report_${startDate}_${endDate}.pdf"` },
    })
  } catch (err) {
    console.error('[pdf] Generation error:', err.message, err.stack)
    return c.json({ error: 'PDF generation failed', message: err.message }, 500)
  }
})

export const buildRichPdfBuffer = async (env, supabase, options) => generatePdfBytes(supabase, options, env)
export default richPdf