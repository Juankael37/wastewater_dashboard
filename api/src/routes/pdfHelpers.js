/**
 * PDF drawing helpers for professional report layout.
 * All drawing uses pdf-lib page.draw*() methods (WinAnsi-safe).
 */
import { rgb } from 'pdf-lib'

// ── Color palette ──────────────────────────────────────────────────────────
export const CLR = {
  primary:    rgb(0.102, 0.227, 0.604),
  primaryLt:  rgb(0.220, 0.380, 0.800),
  accent:     rgb(0.063, 0.557, 0.435),
  influent:   rgb(0.216, 0.475, 0.871),
  effluent:   rgb(0.071, 0.529, 0.420),
  stdLine:    rgb(0.878, 0.290, 0.204),
  pass:       rgb(0.129, 0.663, 0.290),
  fail:       rgb(0.878, 0.235, 0.235),
  grid:       rgb(0.886, 0.894, 0.910),
  border:     rgb(0.784, 0.800, 0.820),
  tblHead:    rgb(0.102, 0.227, 0.604),
  rowAlt:     rgb(0.945, 0.949, 0.961),
  rowWhite:   rgb(1, 1, 1),
  text:       rgb(0.133, 0.145, 0.165),
  textSec:    rgb(0.392, 0.408, 0.443),
  textMuted:  rgb(0.573, 0.584, 0.616),
  white:      rgb(1, 1, 1),
  chartBg:    rgb(0.969, 0.973, 0.980),
}

// ── Sanitize text for WinAnsi encoding ─────────────────────────────────────
export function safe(text) {
  return String(text ?? '')
    .replace(/\u2264/g, '<=').replace(/\u2265/g, '>=')
    .replace(/\u2013/g, '-').replace(/\u2014/g, '--')
    .replace(/\u2018|\u2019/g, "'").replace(/\u201C|\u201D/g, '"')
}

// ── Nice Y-axis scale ──────────────────────────────────────────────────────
export function niceScale(dataMin, dataMax) {
  let mn = dataMin, mx = dataMax
  if (mn === mx) { mn = 0; mx = mx * 2 || 10 }
  if (mn > 0) mn = 0
  const range = mx - mn
  const rough = range / 5
  const mag = Math.pow(10, Math.floor(Math.log10(rough || 1)))
  const res = rough / mag
  const step = (res <= 1.5 ? 1 : res <= 3 ? 2 : res <= 7 ? 5 : 10) * mag
  return { min: Math.floor(mn / step) * step, max: Math.ceil(mx / step) * step, step }
}

// ── Draw dashed horizontal line ────────────────────────────────────────────
export function drawDashed(page, x1, x2, y, color, dash = 6, gap = 4) {
  let x = x1
  while (x < x2) {
    const end = Math.min(x + dash, x2)
    page.drawLine({ start: { x, y }, end: { x: end, y }, thickness: 1.2, color })
    x = end + gap
  }
}

// ── Draw a grouped bar chart ───────────────────────────────────────────────
export function drawBarChart(page, paramData, fonts, opts) {
  const { x: originX, y: originY, width: totalW, height: totalH } = opts
  const labelH = 28, axisW = 48
  const chartX = originX + axisW
  const chartY = originY + labelH
  const chartW = totalW - axisW - 10
  const chartH = totalH - labelH - 30

  // Chart background
  page.drawRectangle({ x: chartX, y: chartY, width: chartW, height: chartH, color: CLR.chartBg, borderColor: CLR.border, borderWidth: 0.5 })

  // Merge influent + effluent into groups by label
  const inf = paramData.influent, eff = paramData.effluent
  const allLabels = [...new Set([...inf.labels, ...eff.labels])]
  if (allLabels.length === 0) return

  const groups = allLabels.map(lbl => ({
    label: lbl,
    inf: inf.labels.indexOf(lbl) >= 0 ? inf.values[inf.labels.indexOf(lbl)] : null,
    eff: eff.labels.indexOf(lbl) >= 0 ? eff.values[eff.labels.indexOf(lbl)] : null,
  }))

  // Y scale
  const allVals = groups.flatMap(g => [g.inf, g.eff].filter(v => v !== null))
  const stdMax = paramData.config?.standard?.max_limit
  if (stdMax !== null && stdMax !== undefined) allVals.push(Number(stdMax))
  const scale = niceScale(Math.min(...allVals), Math.max(...allVals))

  // Grid lines + Y labels
  const numTicks = Math.round((scale.max - scale.min) / scale.step)
  for (let i = 0; i <= numTicks; i++) {
    const val = scale.min + i * scale.step
    const py = chartY + (val - scale.min) / (scale.max - scale.min) * chartH
    page.drawLine({ start: { x: chartX, y: py }, end: { x: chartX + chartW, y: py }, thickness: 0.3, color: CLR.grid })
    const lbl = val % 1 === 0 ? String(val) : val.toFixed(1)
    page.drawText(safe(lbl), { x: originX + axisW - fonts.reg.widthOfTextAtSize(lbl, 7) - 4, y: py - 3, size: 7, font: fonts.reg, color: CLR.textSec })
  }

  // Standard limit dashed line
  if (stdMax !== null && stdMax !== undefined) {
    const stdY = chartY + (Number(stdMax) - scale.min) / (scale.max - scale.min) * chartH
    drawDashed(page, chartX, chartX + chartW, stdY, CLR.stdLine)
    page.drawText(safe(`Limit: ${stdMax}`), { x: chartX + chartW - 60, y: stdY + 3, size: 6.5, font: fonts.bold, color: CLR.stdLine })
  }

  // Bars
  const groupW = chartW / groups.length
  const gap = groupW * 0.25
  const hasBoth = inf.values.length > 0 && eff.values.length > 0
  const barW = hasBoth ? (groupW - gap) / 2 : groupW - gap

  groups.forEach((g, i) => {
    const gx = chartX + i * groupW + gap / 2
    if (g.inf !== null) {
      const bh = ((g.inf - scale.min) / (scale.max - scale.min)) * chartH
      page.drawRectangle({ x: gx, y: chartY, width: barW, height: Math.max(bh, 1), color: CLR.influent })
    }
    if (g.eff !== null) {
      const bx = hasBoth ? gx + barW : gx
      const bh = ((g.eff - scale.min) / (scale.max - scale.min)) * chartH
      page.drawRectangle({ x: bx, y: chartY, width: barW, height: Math.max(bh, 1), color: CLR.effluent })
    }
    // X label (abbreviated)
    const xlbl = safe(g.label.length > 8 ? g.label.slice(0, 8) : g.label)
    page.drawText(xlbl, { x: gx + 2, y: chartY - 12, size: 5.5, font: fonts.reg, color: CLR.textSec })
  })

  // Legend
  const legX = chartX + chartW - 140, legY = chartY + chartH + 6
  if (inf.values.length > 0) {
    page.drawRectangle({ x: legX, y: legY, width: 10, height: 8, color: CLR.influent })
    page.drawText('Influent', { x: legX + 13, y: legY + 1, size: 7, font: fonts.reg, color: CLR.text })
  }
  if (eff.values.length > 0) {
    page.drawRectangle({ x: legX + 60, y: legY, width: 10, height: 8, color: CLR.effluent })
    page.drawText('Effluent', { x: legX + 73, y: legY + 1, size: 7, font: fonts.reg, color: CLR.text })
  }

  // Title
  const title = safe(`${paramData.config.display} (${paramData.config.unit})`)
  page.drawText(title, { x: chartX, y: chartY + chartH + 8, size: 10, font: fonts.bold, color: CLR.text })

  // Y-axis label
  page.drawText(safe(paramData.config.unit || ''), { x: originX + 2, y: chartY + chartH / 2, size: 7, font: fonts.reg, color: CLR.textSec })
}

// ── Draw a formatted data table ────────────────────────────────────────────
export function drawTable(page, headers, rows, colWidths, fonts, opts) {
  const { x, startY, rowH = 16 } = opts
  let y = startY

  // Header row
  page.drawRectangle({ x, y: y - rowH, width: colWidths.reduce((a, b) => a + b, 0), height: rowH, color: CLR.tblHead })
  let cx = x + 5
  headers.forEach((h, i) => {
    page.drawText(safe(h), { x: cx, y: y - rowH + 4, size: 7.5, font: fonts.bold, color: CLR.white })
    cx += colWidths[i]
  })
  y -= rowH

  // Data rows
  for (let r = 0; r < rows.length; r++) {
    const rowColor = r % 2 === 0 ? CLR.rowAlt : CLR.rowWhite
    const totalW = colWidths.reduce((a, b) => a + b, 0)
    page.drawRectangle({ x, y: y - rowH, width: totalW, height: rowH, color: rowColor })
    // Bottom border
    page.drawLine({ start: { x, y: y - rowH }, end: { x: x + totalW, y: y - rowH }, thickness: 0.3, color: CLR.border })

    cx = x + 5
    const row = rows[r]
    row.forEach((cell, i) => {
      let color = CLR.text
      const cellStr = safe(String(cell ?? ''))
      if (cellStr === 'PASS') color = CLR.pass
      else if (cellStr === 'FAIL') color = CLR.fail
      else if (cellStr === 'influent') color = CLR.influent
      else if (cellStr === 'effluent') color = CLR.effluent
      const fnt = (i === headers.length - 1 || cellStr === 'PASS' || cellStr === 'FAIL') ? fonts.bold : fonts.reg
      page.drawText(cellStr.slice(0, 28), { x: cx, y: y - rowH + 4, size: 7, font: fnt, color })
      cx += colWidths[i]
    })
    y -= rowH
  }
  // Left + right borders
  const totalW = colWidths.reduce((a, b) => a + b, 0)
  page.drawLine({ start: { x, y: startY }, end: { x, y }, thickness: 0.5, color: CLR.border })
  page.drawLine({ start: { x: x + totalW, y: startY }, end: { x: x + totalW, y }, thickness: 0.5, color: CLR.border })

  return y
}

// ── Section heading with underline ─────────────────────────────────────────
export function drawSectionHeading(page, text, x, y, width, fonts) {
  page.drawText(safe(text), { x, y, size: 14, font: fonts.bold, color: CLR.primary })
  page.drawLine({ start: { x, y: y - 6 }, end: { x: x + width, y: y - 6 }, thickness: 2, color: CLR.primaryLt })
  return y - 22
}

// ── Stat card (small box with label + value) ───────────────────────────────
export function drawStatCard(page, label, value, x, y, w, fonts, valueColor = CLR.text) {
  page.drawRectangle({ x, y: y - 40, width: w, height: 40, color: CLR.chartBg, borderColor: CLR.border, borderWidth: 0.5 })
  page.drawText(safe(label), { x: x + 8, y: y - 14, size: 7, font: fonts.reg, color: CLR.textSec })
  // Auto-scale value font so it never overflows the card
  const safeVal = safe(value)
  const pad = 16 // left + right padding
  let sz = 12
  while (sz > 6 && fonts.bold.widthOfTextAtSize(safeVal, sz) > w - pad) { sz -= 0.5 }
  page.drawText(safeVal, { x: x + 8, y: y - 30, size: sz, font: fonts.bold, color: valueColor })
}

// ── Add page footers with page numbers ─────────────────────────────────────
export function addFooters(pages, fonts, pageWidth, margin) {
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i]
    const numText = `Page ${i + 1} of ${pages.length}`
    p.drawLine({ start: { x: margin, y: 38 }, end: { x: pageWidth - margin, y: 38 }, thickness: 0.5, color: CLR.grid })
    p.drawText('Generated by AquaDash - Wastewater Monitoring System', { x: margin, y: 26, size: 7.5, font: fonts.reg, color: CLR.textMuted })
    p.drawText(numText, { x: pageWidth - margin - fonts.reg.widthOfTextAtSize(numText, 7.5), y: 26, size: 7.5, font: fonts.reg, color: CLR.textMuted })
  }
}

// ── Fetch image bytes from URL ─────────────────────────────────────────────
export async function fetchImageBytes(url) {
  try {
    console.log(`[pdf-img] Fetching: ${url}`)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'Accept': 'image/*' },
    })
    clearTimeout(timeout)

    if (!response.ok) {
      console.error(`[pdf-img] HTTP ${response.status} for ${url}`)
      return null
    }

    const contentType = response.headers.get('content-type') || ''
    // Guard: if the response is HTML (e.g. Supabase error page), skip it
    if (contentType.includes('text/html') || contentType.includes('application/json')) {
      console.error(`[pdf-img] Got ${contentType} instead of image for ${url}`)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    if (!arrayBuffer || arrayBuffer.byteLength < 100) {
      console.error(`[pdf-img] Empty or tiny response (${arrayBuffer?.byteLength ?? 0} bytes) for ${url}`)
      return null
    }

    console.log(`[pdf-img] OK — ${arrayBuffer.byteLength} bytes, type: ${contentType}`)
    return { bytes: new Uint8Array(arrayBuffer), contentType }
  } catch (err) {
    console.error(`[pdf-img] Fetch error for ${url}:`, err.message)
    return null
  }
}

// ── Detect image format ────────────────────────────────────────────────────
export function getImageFormat(contentType, url) {
  if (contentType?.includes('png')) return 'png'
  if (contentType?.includes('gif')) return 'gif'
  if (contentType?.includes('webp')) return 'webp'
  if (url?.endsWith('.png')) return 'png'
  if (url?.endsWith('.gif')) return 'gif'
  if (url?.endsWith('.webp')) return 'webp'
  return 'jpg'
}

// ── Fetch images and embed them into PDF ───────────────────────────────────
export async function embedImages(pdfDoc, imageUrls, maxImages = 8) {
  const embeddedImages = []
  const recentImages = imageUrls.slice(-maxImages)
  console.log(`[pdf-img] Attempting to embed ${recentImages.length} images`)

  for (const { param, url } of recentImages) {
    const imgData = await fetchImageBytes(url)
    if (!imgData) {
      console.warn(`[pdf-img] Skipping ${param} — fetch returned null`)
      continue
    }
    try {
      const format = getImageFormat(imgData.contentType, url)
      let embeddedImg
      if (format === 'png') embeddedImg = await pdfDoc.embedPng(imgData.bytes)
      else if (format === 'jpg' || format === 'jpeg') embeddedImg = await pdfDoc.embedJpg(imgData.bytes)
      else { console.warn(`[pdf-img] Unsupported format: ${format} for ${param}`); continue }
      embeddedImages.push({ image: embeddedImg, param: param.toUpperCase() })
      console.log(`[pdf-img] Embedded ${param} (${format})`)
    } catch (err) {
      console.error(`[pdf-img] Embed error for ${param} (${url}):`, err.message)
    }
  }

  console.log(`[pdf-img] Successfully embedded ${embeddedImages.length}/${recentImages.length} images`)
  return embeddedImages
}
