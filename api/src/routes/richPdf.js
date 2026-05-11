/**
 * Rich PDF Report Generation using pdf-lib (Edge-compatible)
 * 
 * Usage: POST /api/reports/rich-pdf
 * Body: { start?: '2026-01-01', end?: '2026-01-31', parameters?: ['ph','cod','bod','tss'] }
 * 
 * Requires: pdf-lib (edge-compatible, no Node.js APIs)
 */

import { Hono } from 'hono'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { authMiddleware } from '../middleware.js'

const richPdf = new Hono()

/**
 * Fetch image bytes from URL (Supabase Storage or external)
 */
async function fetchImageBytes(url) {
  try {
    const response = await fetch(url, { redirect: 'follow' })
    if (!response.ok) {
      console.error(`[pdf-img] Failed to fetch ${url}: HTTP ${response.status}`)
      return null
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await response.arrayBuffer()
    return {
      bytes: new Uint8Array(arrayBuffer),
      contentType
    }
  } catch (err) {
    console.error(`[pdf-img] Fetch error for ${url}:`, err.message)
    return null
  }
}

/**
 * Detect image format from content-type or URL extension
 */
function getImageFormat(contentType, url) {
  if (contentType?.includes('png')) return 'png'
  if (contentType?.includes('gif')) return 'gif'
  if (contentType?.includes('webp')) return 'webp'
  if (url?.endsWith('.png')) return 'png'
  if (url?.endsWith('.gif')) return 'gif'
  if (url?.endsWith('.webp')) return 'webp'
  return 'jpg'
}

/**
 * Fetch images and embed them into PDF
 */
async function embedImages(pdfDoc, imageUrls, maxImages = 8) {
  const embeddedImages = []
  const recentImages = imageUrls.slice(-maxImages)
  
  for (const { param, url } of recentImages) {
    const imgData = await fetchImageBytes(url)
    if (!imgData) continue
    
    try {
      const format = getImageFormat(imgData.contentType, url)
      let embeddedImg
      
      if (format === 'png') {
        embeddedImg = await pdfDoc.embedPng(imgData.bytes)
      } else if (format === 'jpg' || format === 'jpeg') {
        embeddedImg = await pdfDoc.embedJpg(imgData.bytes)
      } else {
        console.warn(`[pdf-img] Unsupported format: ${format}, skipping ${url}`)
        continue
      }
      
      embeddedImages.push({
        image: embeddedImg,
        param: param.toUpperCase()
      })
    } catch (err) {
      console.error(`[pdf-img] Embed error for ${url}:`, err.message)
    }
  }
  
  return embeddedImages
}

/**
 * Generate PDF data using pdf-lib
 */
async function generatePdfBytes(supabase, options) {
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
    
    let status = 'N/A'
    if (type === 'effluent') {
      const std = paramData[pName].config.standard
      if (std) {
        const val = Number(m.value)
        if ((std.min_limit === null || val >= std.min_limit) && 
            (std.max_limit === null || val <= std.max_limit)) {
          status = 'PASS'
        } else {
          status = 'FAIL'
        }
      } else {
        status = 'NO STD'
      }
    }

    tableRows.push({
      date: new Date(m.timestamp).toLocaleString(),
      param: m.parameters?.display_name || m.parameters?.name,
      type: m.type,
      value: m.value,
      unit: m.parameters?.unit || '',
      status,
      notes: m.notes
    })
  }
  
  const imageEntries = []
  const seenUrls = new Set()
  for (const row of tableRows) {
    let notesObj = null
    if (typeof row.notes === 'object' && row.notes !== null) {
      notesObj = row.notes
    } else if (typeof row.notes === 'string' && row.notes.trim().startsWith('{')) {
      try {
        notesObj = JSON.parse(row.notes)
      } catch (e) { }
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

  const pdfDoc = await PDFDocument.create()
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  
  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 40
  const contentWidth = pageWidth - margin * 2
  let yPosition = pageHeight - margin

  const primaryColor = rgb(0.118, 0.251, 0.682)
  const secondaryColor = rgb(0.145, 0.161, 0.212)
  const lightGray = rgb(0.9, 0.9, 0.9)
  const passColor = rgb(0.22, 0.78, 0.22)
  const failColor = rgb(0.93, 0.27, 0.27)

  function drawWrappedText(text, x, y, maxWidth, font, fontSize, color = secondaryColor) {
    const words = text.split(' ')
    let line = ''
    let currentY = y
    
    for (const word of words) {
      const testLine = line + word + ' '
      const textWidth = font.widthOfTextAtSize(testLine, fontSize)
      if (textWidth > maxWidth && line !== '') {
        font.drawAt(line.trim(), { x, y: currentY, size: fontSize, font, color })
        line = word + ' '
        currentY -= fontSize + 4
      } else {
        line = testLine
      }
    }
    if (line.trim()) {
      font.drawAt(line.trim(), { x, y: currentY, size: fontSize, font, color })
      currentY -= fontSize + 4
    }
    return currentY
  }

  function checkNewPage() {
    if (yPosition < 100) {
      pdfDoc.addPage()
      yPosition = pageHeight - margin
      return true
    }
    return false
  }

  let page = pdfDoc.addPage()
  
  page.drawText(title, { x: margin, y: yPosition - 20, size: 18, font: helveticaBold, color: primaryColor })
  yPosition -= 45
  
  page.drawText('Environmental Compliance Report', { x: margin, y: yPosition - 10, size: 12, font: helveticaFont, color: secondaryColor })
  yPosition -= 30
  
  pdfDoc.drawRectangle({ x: margin, y: yPosition - 15, width: contentWidth, height: 50, color: primaryColor })
  
  const metaItems = [
    { label: 'Report Period', value: `${startDate} to ${endDate}` },
    { label: 'Total Records', value: tableRows.length.toString() },
    { label: 'Generated', value: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }
  ]
  
  const colWidth = contentWidth / 3
  metaItems.forEach((item, idx) => {
    const x = margin + idx * colWidth + 10
    page.drawText(item.label.toUpperCase(), { x, y: yPosition - 5, size: 7, font: helveticaFont, color: rgb(1, 1, 1) })
    page.drawText(item.value, { x, y: yPosition - 20, size: 11, font: helveticaBold, color: rgb(1, 1, 1) })
  })
  
  yPosition -= 60

  if (Object.keys(paramData).length > 0) {
    page.drawText('Parameter Summary', { x: margin, y: yPosition, size: 14, font: helveticaBold, color: primaryColor })
    pdfDoc.drawLine({ start: { x: margin, y: yPosition - 5 }, end: { x: margin + contentWidth, y: yPosition - 5 }, thickness: 2, color: rgb(0.23, 0.51, 0.96) })
    yPosition -= 25
    
    for (const [key, data] of Object.entries(paramData)) {
      checkNewPage()
      page.drawText(`${data.config.display} (${data.config.unit})`, { x: margin, y: yPosition, size: 11, font: helveticaBold, color: secondaryColor })
      yPosition -= 18
      
      const influentVals = data.influent.values.slice(-5)
      const effluentVals = data.effluent.values.slice(-5)
      
      if (influentVals.length > 0) {
        const infAvg = (influentVals.reduce((a, b) => a + b, 0) / influentVals.length).toFixed(2)
        page.drawText(`Influent (avg): ${infAvg} ${data.config.unit}`, { x: margin + 10, y: yPosition, size: 9, font: helveticaFont, color: rgb(0.86, 0.15, 0.15) })
        yPosition -= 14
      }
      
      if (effluentVals.length > 0) {
        const effAvg = (effluentVals.reduce((a, b) => a + b, 0) / effluentVals.length).toFixed(2)
        let statusColor = secondaryColor
        if (data.config.standard) {
          const pass = effAvg <= data.config.standard.max_limit
          statusColor = pass ? passColor : failColor
        }
        page.drawText(`Effluent (avg): ${effAvg} ${data.config.unit}`, { x: margin + 10, y: yPosition, size: 9, font: helveticaFont, color: rgb(0.15, 0.39, 0.92) })
        yPosition -= 14
        
        if (data.config.standard) {
          const limit = data.config.standard.max_limit
          page.drawText(`Standard: ≤ ${limit} ${data.config.unit}`, { x: margin + 10, y: yPosition, size: 8, font: helveticaFont, color: statusColor })
          yPosition -= 12
        }
      }
      yPosition -= 10
    }
  }

  if (standards && standards.length > 0) {
    checkNewPage()
    page.drawText('Effluent Standards (Class C)', { x: margin, y: yPosition, size: 14, font: helveticaBold, color: primaryColor })
    pdfDoc.drawLine({ start: { x: margin, y: yPosition - 5 }, end: { x: margin + contentWidth, y: yPosition - 5 }, thickness: 2, color: rgb(0.23, 0.51, 0.96) })
    yPosition -= 25
    
    for (const std of standards) {
      checkNewPage()
      const pConfig = Object.values(paramConfigs).find(p => p.id === std.parameter_id)
      if (!pConfig) continue
      
      let limitStr = ''
      if (std.min_limit !== null && std.max_limit !== null) {
        limitStr = `${std.min_limit} - ${std.max_limit}`
      } else if (std.max_limit !== null) {
        limitStr = `≤ ${std.max_limit}`
      } else if (std.min_limit !== null) {
        limitStr = `≥ ${std.min_limit}`
      }
      
      page.drawText(`${pConfig.display}: ${limitStr} ${pConfig.unit}`, { x: margin, y: yPosition, size: 10, font: helveticaFont, color: secondaryColor })
      yPosition -= 16
    }
  }

  if (tableRows.length > 0) {
    checkNewPage()
    page.drawText('Measurement Data (Recent 30 Records)', { x: margin, y: yPosition, size: 14, font: helveticaBold, color: primaryColor })
    pdfDoc.drawLine({ start: { x: margin, y: yPosition - 5 }, end: { x: margin + contentWidth, y: yPosition - 5 }, thickness: 2, color: rgb(0.23, 0.51, 0.96) })
    yPosition -= 25
    
    const colWidths = [160, 80, 60, 60, 50, 50]
    const headers = ['Date', 'Parameter', 'Type', 'Value', 'Unit', 'Status']
    
    pdfDoc.drawRectangle({ x: margin, y: yPosition - 12, width: contentWidth, height: 16, color: primaryColor })
    let xOffset = margin + 5
    headers.forEach((header, i) => {
      page.drawText(header, { x: xOffset, y: yPosition - 10, size: 8, font: helveticaBold, color: rgb(1, 1, 1) })
      xOffset += colWidths[i]
    })
    yPosition -= 20
    
    const displayRows = tableRows.slice(0, 30)
    for (const row of displayRows) {
      checkNewPage()
      const bgColor = displayRows.indexOf(row) % 2 === 0 ? lightGray : rgb(1, 1, 1)
      pdfDoc.drawRectangle({ x: margin, y: yPosition - 10, width: contentWidth, height: 14, color: bgColor })
      
      xOffset = margin + 5
      page.drawText(row.date.slice(0, 16), { x: xOffset, y: yPosition - 8, size: 7, font: helveticaFont, color: secondaryColor })
      xOffset += colWidths[0]
      
      page.drawText(row.param, { x: xOffset, y: yPosition - 8, size: 7, font: helveticaBold, color: secondaryColor })
      xOffset += colWidths[1]
      
      const typeColor = row.type === 'influent' ? rgb(0.86, 0.15, 0.15) : rgb(0.15, 0.39, 0.92)
      page.drawText(row.type, { x: xOffset, y: yPosition - 8, size: 7, font: helveticaFont, color: typeColor })
      xOffset += colWidths[2]
      
      page.drawText(String(row.value), { x: xOffset, y: yPosition - 8, size: 7, font: helveticaFont, color: secondaryColor })
      xOffset += colWidths[3]
      
      page.drawText(row.unit, { x: xOffset, y: yPosition - 8, size: 7, font: helveticaFont, color: secondaryColor })
      xOffset += colWidths[4]
      
      let statusColor = secondaryColor
      if (row.status === 'PASS') statusColor = passColor
      else if (row.status === 'FAIL') statusColor = failColor
      
      page.drawText(row.status, { x: xOffset, y: yPosition - 8, size: 7, font: helveticaBold, color: statusColor })
      yPosition -= 14
    }
  }

  if (imageEntries.length > 0) {
    checkNewPage()
    page.drawText('Field Photographs', { x: margin, y: yPosition, size: 14, font: helveticaBold, color: primaryColor })
    pdfDoc.drawLine({ start: { x: margin, y: yPosition - 5 }, end: { x: margin + contentWidth, y: yPosition - 5 }, thickness: 2, color: rgb(0.23, 0.51, 0.96) })
    yPosition -= 25
    
    const embeddedImages = await embedImages(pdfDoc, imageEntries, 8)
    
    if (embeddedImages.length > 0) {
      const imgWidth = (contentWidth - 15) / 2
      const imgHeight = 100
      let xOffset = margin
      let rowStartY = yPosition
      
      for (let i = 0; i < embeddedImages.length; i++) {
        const { image, param } = embeddedImages[i]
        
        const scale = Math.min(imgWidth / image.width, imgHeight / image.height)
        const scaledWidth = image.width * scale
        const scaledHeight = image.height * scale
        
        checkNewPage()
        
        pdfDoc.drawRectangle({ x: xOffset, y: yPosition - scaledHeight - 20, width: scaledWidth + 10, height: scaledHeight + 25, color: lightGray, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1 })
        
        pdfDoc.drawImage(image, {
          x: xOffset + 5,
          y: yPosition - scaledHeight - 15,
          width: scaledWidth,
          height: scaledHeight
        })
        
        page.drawText(param, { x: xOffset + 5, y: yPosition - scaledHeight - 28, size: 8, font: helveticaBold, color: primaryColor })
        
        if (i % 2 === 0) {
          xOffset = margin + imgWidth + 15
        } else {
          xOffset = margin
          yPosition -= imgHeight + 35
        }
      }
      
      if (embeddedImages.length % 2 === 1) {
        yPosition -= imgHeight + 35
      }
    } else {
      page.drawText('Could not load image attachments', { x: margin, y: yPosition - 10, size: 9, font: helveticaFont, color: secondaryColor })
      yPosition -= 20
    }
  }

  checkNewPage()
  const footerY = 30
  pdfDoc.drawLine({ start: { x: margin, y: footerY + 10 }, end: { x: pageWidth - margin, y: footerY + 10 }, thickness: 1, color: lightGray })
  page.drawText('Generated by AquaDash - Wastewater Monitoring System', { x: margin, y: footerY, size: 8, font: helveticaFont, color: rgb(0.58, 0.64, 0.72) })

  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}

richPdf.post('/api/reports/rich-pdf', authMiddleware, async (c) => {
  let body
  try { body = await c.req.json() } catch { body = {} }
  const { start, end, parameters: requestedParams } = body

  const supabase = c.get('supabase')
  const startDate = start || new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const endDate = end || new Date().toISOString().slice(0, 10)

  try {
    const pdfBytes = await generatePdfBytes(supabase, {
      startDate,
      endDate,
      parameters: requestedParams,
      title: 'Wastewater Treatment Plant'
    })

    return new Response(pdfBytes, {
      headers: { 
        'Content-Type': 'application/pdf', 
        'Content-Disposition': `attachment; filename="wastewater_report_${startDate}_${endDate}.pdf"` 
      }
    })
  } catch (err) {
    console.error('[pdf] Generation error:', err.message)
    return c.json({ error: 'PDF generation failed', message: err.message }, 500)
  }
})

export const buildRichPdfBuffer = async (env, supabase, options) => {
  return generatePdfBytes(supabase, options)
}

export default richPdf