/**
 * Rich PDF Report Generation using Cloudflare Browser Run (Puppeteer)
 * 
 * Usage: POST /api/reports/rich-pdf
 * Body: { start?: '2026-01-01', end?: '2026-01-31', parameters?: ['ph','cod','bod','tss'] }
 * 
 * Requires:
 * 1. @cloudflare/puppeteer package
 * 2. Browser binding in wrangler.toml
 */

import { Hono } from 'hono'
import puppeteer from '@cloudflare/puppeteer'
import { authMiddleware } from '../middleware.js'

const richPdf = new Hono()

/**
 * Fetch an image URL and return a base64 data URI.
 * This is the key fix for images missing from PDFs:
 * Puppeteer inside Cloudflare cannot reliably fetch external URLs
 * during page render, so we embed all images as inline data URIs
 * before the HTML is handed to Puppeteer.
 */
async function fetchImageAsDataUri(url) {
  try {
    const response = await fetch(url, { redirect: 'follow' })
    if (!response.ok) {
      console.error(`[pdf-img] Failed to fetch ${url}: HTTP ${response.status}`)
      return null
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await response.arrayBuffer()
    let base64 = ''
    if (typeof Buffer !== 'undefined') {
      base64 = Buffer.from(arrayBuffer).toString('base64')
    } else {
      const bytes = new Uint8Array(arrayBuffer)
      let binary = ''
      const len = bytes.byteLength
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      base64 = btoa(binary)
    }
    return `data:${contentType};base64,${base64}`
  } catch (err) {
    console.error(`[pdf-img] Fetch error for ${url}:`, err.message)
    return null
  }
}

/**
 * Build the photo grid HTML section, embedding images as data URIs.
 * @param {Array<{param: string, url: string}>} images
 */
async function buildPhotoGridHtml(images) {
  if (images.length === 0) {
    return '<p class="note" style="margin-top:15px;color:#64748b;font-size:9pt;">No photo attachments found for this period.</p>'
  }

  // Fetch all images in parallel and embed as data URIs
  const loaded = await Promise.all(
    images.slice(0, 8).map(async ({ param, url }) => {
      const dataUri = await fetchImageAsDataUri(url)
      return { param, dataUri }
    })
  )

  const boxes = loaded
    .filter(({ dataUri }) => dataUri !== null)
    .map(({ param, dataUri }) => `
      <div class="photo-box">
        <img src="${dataUri}" alt="${param}" style="max-width:100%;max-height:130px;object-fit:contain;" />
        <div class="photo-label">${param.toUpperCase()}</div>
      </div>`)
    .join('')

  return boxes.length > 0
    ? `<div class="photo-grid">${boxes}</div>`
    : '<p class="note" style="margin-top:15px;color:#64748b;font-size:9pt;">Could not load photo attachments.</p>'
}

// Test endpoint - NO auth
richPdf.get('/api/test-pdf-noauth', async (c) => {
  const env = c.env
  try {
    const browser = await puppeteer.launch(env.BROWSER)
    const page = await browser.newPage()
    await page.setContent('<h1>Test PDF</h1><p>This works!</p>')
    const pdf = await page.pdf({ format: 'A4' })
    await browser.close()
    return c.json({ success: true, pdfSize: pdf.length })
  } catch (err) {
    return c.json({ error: err.message }, 500)
  }
})

/**
 * Generate Rich PDF HTML
 * Extracted so both manual endpoint and cron job can share identical layout logic.
 */
async function generateRichPdfHtml(supabase, options) {
  const { startDate, endDate, parameters: requestedParams, title = 'Wastewater Treatment Plant' } = options

  const { data: measurements } = await supabase
    .from('measurements')
    .select('*, parameters!inner(id, name, display_name, unit)')
    .gte('timestamp', startDate + 'T00:00:00Z')
    .lte('timestamp', endDate + 'T23:59:59Z')
    .order('timestamp', { ascending: true })
    .limit(500)

  const { data: allParameters } = await supabase
    .from('parameters')
    .select('id, name, display_name, unit')
    .order('name')

  // Fetch effluent standards for Pass/Fail checks
  const { data: standards } = await supabase
    .from('standards')
    .select('parameter_id, min_limit, max_limit')
    .eq('class', 'C')
  
  const stdMap = new Map((standards || []).map(s => [s.parameter_id, s]))

  const paramConfigs = {}
  for (const p of (allParameters || [])) {
    const key = p.name.toLowerCase()
    const std = stdMap.get(p.id)
    paramConfigs[key] = { 
      id: p.id,
      display: p.display_name || p.name, 
      unit: p.unit || '',
      standard: std || null
    }
  }

  const filteredMeasurements = (measurements || []).filter(m => {
    if (!requestedParams || requestedParams.length === 0) return true
    const pName = m.parameters?.name?.toLowerCase()
    return requestedParams.some(rp => rp.toLowerCase() === pName)
  })

  const paramData = {}
  const tableRows = []
  
  for (const m of filteredMeasurements) {
    const pName = m.parameters?.name?.toLowerCase() || 'unknown'
    const pId = m.parameters?.id
    if (!paramData[pName]) {
      paramData[pName] = { 
        influent: { labels: [], values: [] }, 
        effluent: { labels: [], values: [] },
        config: paramConfigs[pName] || { id: pId, display: pName, unit: '', standard: stdMap.get(pId) || null }
      }
    }
    const type = m.type === 'effluent' ? 'effluent' : 'influent'
    if (paramData[pName][type].values.length < 20) {
      const d = new Date(m.timestamp)
      const timeStr = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0')
      paramData[pName][type].labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + timeStr)
      paramData[pName][type].values.push(Number(m.value))
    }
    
    // Status check
    let status = 'N/A'
    let statusClass = 'status-na'
    if (type === 'effluent') {
      const std = paramData[pName].config.standard
      if (std) {
        const val = Number(m.value)
        if ((std.min_limit === null || val >= std.min_limit) && 
            (std.max_limit === null || val <= std.max_limit)) {
          status = 'PASS'
          statusClass = 'status-pass'
        } else {
          status = 'FAIL'
          statusClass = 'status-fail'
        }
      } else {
        status = 'NO STD'
        statusClass = 'status-nostd'
      }
    }

    tableRows.push({
      date: new Date(m.timestamp).toLocaleString(),
      param: m.parameters?.display_name || m.parameters?.name,
      type: m.type,
      value: m.value,
      unit: m.parameters?.unit || '',
      status,
      statusClass,
      notes: m.notes
    })
  }
  
  // Extract images from notes field (JSON format) — keyed by parameter name
  const imageEntries = []  // [{param, url}]
  const seenUrls = new Set()
  for (const row of tableRows) {
    let notesObj = null;
    if (typeof row.notes === 'object' && row.notes !== null) {
      notesObj = row.notes;
    } else if (typeof row.notes === 'string' && row.notes.trim().startsWith('{')) {
      try {
        notesObj = JSON.parse(row.notes)
      } catch (e) { /* not JSON, skip */ }
    }

    if (notesObj && notesObj.images && typeof notesObj.images === 'object') {
      for (const [param, url] of Object.entries(notesObj.images)) {
        if (url && typeof url === 'string' && !seenUrls.has(url)) {
          seenUrls.add(url)
          imageEntries.push({ param, url })
        }
      }
    }
  }

  // Generate charts for each parameter
  const paramChartSections = Object.entries(paramData).map(([key, data], idx) => {
    const allLabels = [...new Set([...data.influent.labels, ...data.effluent.labels])].slice(-15)
    
    const influentMap = {}
    data.influent.labels.forEach((lbl, i) => { influentMap[lbl] = data.influent.values[i] })
    const effluentMap = {}
    data.effluent.labels.forEach((lbl, i) => { effluentMap[lbl] = data.effluent.values[i] })
    
    const alignedInfluent = allLabels.map(lbl => influentMap[lbl] ?? null)
    const alignedEffluent = allLabels.map(lbl => effluentMap[lbl] ?? null)
    
    // Add standard max line if it exists
    let annotationJS = ''
    if (data.config.standard && data.config.standard.max_limit !== null) {
      const maxLimit = data.config.standard.max_limit
      annotationJS = `
        const maxLimit = ${maxLimit};
        const ctxPlugin = {
          id: 'standardLine',
          beforeDraw: (chart) => {
            const { ctx, chartArea: { top, right, bottom, left, width, height }, scales: { x, y } } = chart;
            const yPos = y.getPixelForValue(maxLimit);
            if (yPos > top && yPos < bottom) {
              ctx.save();
              ctx.beginPath();
              ctx.setLineDash([5, 5]);
              ctx.moveTo(left, yPos);
              ctx.lineTo(right, yPos);
              ctx.lineWidth = 2;
              ctx.strokeStyle = '#ef4444';
              ctx.stroke();
              ctx.fillStyle = '#ef4444';
              ctx.font = '10px Arial';
              ctx.fillText('Standard: ' + maxLimit, left + 5, yPos - 5);
              ctx.restore();
            }
          }
        };
      `;
    }

    return `
    <div class="chart-section">
      <h3 class="section-title">${data.config.display} (${data.config.unit})</h3>
      <div class="chart-container">
        <canvas id="chart-${idx}"></canvas>
      </div>
      <script>
        (function() {
          const ctx = document.getElementById('chart-${idx}').getContext('2d');
          const labels = ${JSON.stringify(allLabels)};
          const influentData = ${JSON.stringify(alignedInfluent)};
          const effluentData = ${JSON.stringify(alignedEffluent)};
          const isSinglePoint = labels.length <= 1;
          ${annotationJS}
          new Chart(ctx, {
            type: isSinglePoint ? 'bar' : 'line',
            data: {
              labels: labels,
              datasets: [
                { label: 'Influent', data: influentData, borderColor: '#dc2626', backgroundColor: '#dc262680', fill: true, tension: 0.3, pointRadius: 6, spanGaps: true },
                { label: 'Effluent', data: effluentData, borderColor: '#2563eb', backgroundColor: '#2563eb80', fill: true, tension: 0.3, pointRadius: 6, spanGaps: true }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom' } },
              scales: { y: { beginAtZero: false } }
            },
            plugins: [${annotationJS ? 'ctxPlugin' : ''}]
          });
        })();
      </script>
    </div>`
  }).join('')

  // Generate Standards Table
  const stdRows = Object.values(paramConfigs)
    .filter(p => p.standard)
    .map(p => {
      let limitStr = ''
      if (p.standard.min_limit !== null && p.standard.max_limit !== null) {
        limitStr = `${p.standard.min_limit} - ${p.standard.max_limit}`
      } else if (p.standard.max_limit !== null) {
        limitStr = `≤ ${p.standard.max_limit}`
      } else if (p.standard.min_limit !== null) {
        limitStr = `≥ ${p.standard.min_limit}`
      }
      return `
        <tr>
          <td><strong>${p.display}</strong></td>
          <td>${limitStr} ${p.unit}</td>
        </tr>
      `
    }).join('')

  const standardsSection = stdRows ? `
    <div class="standards-section">
      <h2>Effluent Standards (Class C)</h2>
      <table class="data-table standards-table">
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Standard Limit</th>
          </tr>
        </thead>
        <tbody>
          ${stdRows}
        </tbody>
      </table>
    </div>
  ` : ''

  const tableSection = tableRows.length > 0 ? `
    <div class="table-section">
      <h2>Measurement Data</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>Parameter</th>
            <th>Type</th>
            <th>Value</th>
            <th>Unit</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows.slice(0, 50).map(row => `
            <tr>
              <td>${row.date}</td>
              <td><strong>${row.param}</strong></td>
              <td><span class="type-${row.type}">${row.type}</span></td>
              <td>${row.value}</td>
              <td>${row.unit}</td>
              <td><span class="status-badge ${row.statusClass}">${row.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${tableRows.length > 50 ? `<p class="note">Showing 50 of ${tableRows.length} records</p>` : ''}
    </div>
  ` : ''

  // Embed images as base64 data URIs so Puppeteer never needs network requests for them
  const photoGridHtml = await buildPhotoGridHtml(imageEntries)

  const notesSection = `
    <div class="notes-section">
      <h2>Notes & Observations</h2>
      <div class="notes-box">
        <p>Record any observations, custom configurations, or issues below:</p>
        <div class="notes-lines">
          <div class="note-line"></div>
          <div class="note-line"></div>
          <div class="note-line"></div>
          <div class="note-line"></div>
          <div class="note-line"></div>
          <div class="note-line"></div>
        </div>
      </div>
      ${imageEntries.length > 0 ? '<h2>Field Photographs</h2>' : ''}
      ${photoGridHtml}
    </div>
  `

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    @page {
      size: A4;
      margin: 15mm 15mm 20mm 15mm;
    }
    
    body {
      font-family: 'Lato', 'Segoe UI', Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #1e293b;
      background: #fff;
      width: 170mm;
      margin: 0 auto;
    }
    
    /* Prevent element splitting across pages */
    h2, h3, .chart-section, .photo-grid, .standards-section {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    
    /* Tables naturally flow, but rows should not break */
    .data-table tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    
    .table-section, .notes-section {
      margin-top: 20px;
    }
    
    h2 {
      margin-top: 20px;
      margin-bottom: 10px;
      padding-top: 10px;
      font-size: 14pt;
      color: #1e40af;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 6px;
    }
    
    h3.section-title {
      font-size: 12pt;
      color: #1e40af;
      margin-bottom: 10px;
    }
    
    /* Header - flexbox for alignment */
    .header {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
      padding: 15px 20px;
      margin: -15mm -15mm 15px -15mm;
      display: flex;
      flex-direction: column;
    }
    
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .header h1 {
      font-size: 22pt;
      font-weight: 700;
      margin-bottom: 4px;
    }
    
    .header .subtitle {
      font-size: 11pt;
      opacity: 0.9;
    }

    .header .version-tag {
      background: #fbbf24;
      color: #1e293b;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 700;
    }
    
    .header-meta {
      display: flex;
      justify-content: space-around;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid rgba(255,255,255,0.3);
      flex: 1;
    }
    
    .header-meta-item {
      text-align: center;
      flex: 1;
    }
    
    .header-meta-label {
      font-size: 8pt;
      text-transform: uppercase;
      opacity: 0.8;
    }
    
    .header-meta-value {
      font-size: 12pt;
      font-weight: 700;
    }
    
    /* Charts Layout - Single Column and Taller */
    .charts-grid {
      display: flex;
      flex-direction: column;
      gap: 30px;
    }
    
    .chart-section {
      background: #f8fafc;
      padding: 15px;
      border-radius: 6px;
    }
    
    .chart-container {
      height: 280px;
      width: 100%;
    }
    
    /* Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin-bottom: 15px;
    }
    
    .data-table th {
      background: #1e40af;
      color: white;
      padding: 10px 8px;
      text-align: left;
      font-weight: 700;
    }
    
    .data-table td {
      padding: 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .data-table tr:nth-child(even) {
      background: #f8fafc;
    }
    
    .standards-table {
      width: 60%;
    }
    
    .type-influent {
      color: #dc2626;
      font-weight: 700;
    }
    
    .type-effluent {
      color: #2563eb;
      font-weight: 700;
    }
    
    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: bold;
    }
    
    .status-pass {
      background-color: #dcfce7;
      color: #166534;
    }
    
    .status-fail {
      background-color: #fee2e2;
      color: #991b1b;
    }
    
    .status-na, .status-nostd {
      color: #94a3b8;
    }
    
    .note {
      font-size: 8pt;
      color: #64748b;
      font-style: italic;
    }
    
    /* Notes Section */
    .notes-box {
      background: #f8fafc;
      padding: 20px;
      border-radius: 6px;
      margin-bottom: 20px;
      break-inside: avoid;
    }
    
    .notes-lines {
      margin-top: 15px;
    }
    
    .note-line {
      border-bottom: 1px solid #cbd5e1;
      height: 30px;
      margin-bottom: 10px;
    }
    
    .photo-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }

    .photo-box {
      border: 2px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 160px;
      background: #f8fafc;
    }

    .photo-box img {
      max-height: 140px;
      max-width: 100%;
      object-fit: contain;
      border-radius: 4px;
    }

    .photo-label {
      margin-top: 6px;
      font-size: 8pt;
      font-weight: 700;
      color: #1e40af;
      text-align: center;
    }
    
    /* Footer */
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 8pt;
      color: #94a3b8;
    }
    
    .footer-generated {
      font-size: 8pt;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-content">
      <div>
        <h1>${title}</h1>
        <p class="subtitle">Environmental Compliance Report</p>
      </div>
      <span class="version-tag">v2.1</span>
    </div>
    <div class="header-meta">
      <div class="header-meta-item">
        <div class="header-meta-label">Report Period</div>
        <div class="header-meta-value">${startDate} to ${endDate}</div>
      </div>
      <div class="header-meta-item">
        <div class="header-meta-label">Total Records</div>
        <div class="header-meta-value">${tableRows.length}</div>
      </div>
      <div class="header-meta-item">
        <div class="header-meta-label">Generated</div>
        <div class="header-meta-value">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
      </div>
    </div>
  </div>
  
  <h2>Parameter Trends: Influent vs Effluent</h2>
  <div class="charts-grid">
    ${paramChartSections}
  </div>
  
  ${standardsSection}
  ${tableSection}
  ${notesSection}
  
  <div class="footer">
    <div class="footer-generated">Generated by AquaDash - Wastewater Monitoring System</div>
  </div>
</body>
</html>`

  return html
}

// Main PDF endpoint with professional A4 template
richPdf.post('/api/reports/rich-pdf', authMiddleware, async (c) => {
  const env = c.env
  
  let body
  try { body = await c.req.json() } catch { body = {} }
  const { start, end, parameters: requestedParams } = body

  let browser
  try { browser = await puppeteer.launch(env.BROWSER) }
  catch (err) { return c.json({ error: 'Browser launch failed', message: err.message }, 503) }

  const supabase = c.get('supabase')
  const startDate = start || new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const endDate = end || new Date().toISOString().slice(0, 10)

  try {
    const html = await generateRichPdfHtml(supabase, {
      startDate,
      endDate,
      parameters: requestedParams,
      title: 'Wastewater Treatment Plant'
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' }
    })
    await browser.close()
    
    return new Response(pdf, {
      headers: { 
        'Content-Type': 'application/pdf', 
        'Content-Disposition': `attachment; filename="wastewater_report_${startDate}_${endDate}.pdf"` 
      }
    })
  } catch (err) {
    if (browser) await browser.close()
    return c.json({ error: 'PDF generation failed', message: err.message }, 500)
  }
})

export const buildRichPdfBuffer = async (env, supabase, options) => {
  const { startDate, endDate, title = 'Wastewater Treatment Plant', parameters: requestedParams } = options

  let browser
  try { browser = await puppeteer.launch(env.BROWSER) }
  catch (err) { throw new Error(`Browser launch failed: ${err.message}`) }

  try {
    const html = await generateRichPdfHtml(supabase, {
      startDate,
      endDate,
      parameters: requestedParams,
      title
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' }
    })
    await browser.close()
    return pdf
  } catch (err) {
    if (browser) await browser.close()
    throw new Error(`PDF generation failed: ${err.message}`)
  }
}

export default richPdf