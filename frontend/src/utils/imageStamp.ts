/**
 * Image stamp utility — draws a date/time watermark on captured images
 * using the HTML Canvas API. Memory-safe: disposes canvas after use.
 *
 * Uses createImageBitmap() instead of new Image() for reliable
 * rendering in Capacitor / Android WebView environments.
 */
import { formatStampDateTime, getTimezoneAbbr, detectTimezone } from './timezone'

/**
 * Convert a data-URL or blob-URL string into a Blob.
 */
async function sourceToBlob(source: string): Promise<Blob> {
  if (source.startsWith('data:')) {
    // Decode data URL manually (avoids fetch() issues on some WebViews)
    const [header, b64data] = source.split(',')
    const mime = header?.match(/:(.*?);/)?.[1] || 'image/jpeg'
    const binary = atob(b64data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: mime })
  }
  // Blob URL or remote URL — fetch it
  const res = await fetch(source)
  return await res.blob()
}

/**
 * Draw the timestamp watermark bar onto a canvas context.
 */
function drawTimestampBar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  label?: string,
): void {
  const tz = detectTimezone()
  const now = new Date()
  const dateStr = formatStampDateTime(now, tz)
  const tzAbbr = getTimezoneAbbr(tz)
  const stampText = label
    ? `${label.toUpperCase()}  |  ${dateStr}  ${tzAbbr}`
    : `${dateStr}  ${tzAbbr}`

  // Font size: ~5% of image width, clamped 14–36px
  const fontSize = Math.max(14, Math.min(36, Math.round(width * 0.05)))
  const pad = Math.round(fontSize * 0.7)
  const barH = fontSize + pad * 2

  // Dark semi-transparent bar
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
  ctx.fillRect(0, height - barH, width, barH)

  // Teal accent line at top of bar
  ctx.fillStyle = 'rgba(16, 185, 129, 0.9)'
  ctx.fillRect(0, height - barH, width, 3)

  // White text with shadow for readability
  ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 3
  ctx.shadowOffsetX = 1
  ctx.shadowOffsetY = 1
  ctx.fillText(stampText, pad, height - barH / 2)

  // Reset shadow
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
}

/**
 * Stamp a date/time watermark onto an image.
 * Uses createImageBitmap for reliable WebView support.
 *
 * @param source  Base64 data URL or Blob URL of the original image
 * @param label   Optional label (e.g. parameter name like "COD")
 * @returns       New base64 data URL with the watermark baked in
 */
export async function stampImage(
  source: string,
  label?: string,
): Promise<string> {
  try {
    console.log('[stamp] Starting stamp...')
    const blob = await sourceToBlob(source)
    console.log(`[stamp] Blob created: ${blob.size} bytes, type=${blob.type}`)

    // createImageBitmap works reliably in Android WebView (unlike new Image())
    const bitmap = await createImageBitmap(blob)
    const { width, height } = bitmap
    console.log(`[stamp] Bitmap: ${width}x${height}`)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { alpha: false })

    if (!ctx) {
      console.warn('[stamp] No canvas context')
      bitmap.close()
      return source
    }

    // Draw original image
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close() // free memory immediately

    // Draw timestamp watermark
    drawTimestampBar(ctx, width, height, label)

    // Export as JPEG data URL
    const stamped = canvas.toDataURL('image/jpeg', 0.85)
    console.log(`[stamp] Done! Output: ${stamped.length} chars`)

    // Cleanup canvas memory
    canvas.width = 0
    canvas.height = 0

    return stamped
  } catch (err) {
    console.error('[stamp] Failed:', err)
    return source // return original on any error
  }
}

/**
 * Stamp an image from a File object. Returns a new File with the watermark.
 */
export async function stampImageFile(
  file: File,
  label?: string,
): Promise<File> {
  try {
    // Use the File/Blob directly with createImageBitmap (no URL needed)
    console.log(`[stamp-file] Processing ${file.name} (${file.size} bytes)`)

    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { alpha: false })

    if (!ctx) {
      bitmap.close()
      return file
    }

    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    // Draw timestamp watermark
    drawTimestampBar(ctx, width, height, label)

    // Convert canvas to Blob, then to File
    return new Promise<File>((resolve) => {
      canvas.toBlob(
        (blob) => {
          canvas.width = 0
          canvas.height = 0
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }))
          } else {
            resolve(file)
          }
        },
        'image/jpeg',
        0.85,
      )
    })
  } catch (err) {
    console.error('[stamp-file] Failed:', err)
    return file
  }
}
