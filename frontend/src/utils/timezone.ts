/**
 * Timezone utilities — auto-detect the user's local timezone and provide
 * consistent date/time formatting across the entire application.
 */

const STORAGE_KEY = 'ww_timezone'

/** Detect the user's IANA timezone string (e.g. "Asia/Manila", "America/New_York"). */
export function detectTimezone(): string {
  // 1. Check if the user manually set a preference
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) return stored

  // 2. Auto-detect from the browser
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

/** Save a manual timezone override. */
export function setTimezone(tz: string): void {
  localStorage.setItem(STORAGE_KEY, tz)
}

/** Clear the manual override so auto-detection is used again. */
export function clearTimezoneOverride(): void {
  localStorage.removeItem(STORAGE_KEY)
}

/** Get the short timezone abbreviation (e.g. "PHT", "EST", "UTC+8"). */
export function getTimezoneAbbr(tz?: string): string {
  const zone = tz || detectTimezone()
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      timeZoneName: 'short',
    }).formatToParts(new Date())
    return parts.find(p => p.type === 'timeZoneName')?.value || zone
  } catch {
    return zone
  }
}

/** Get a UTC offset string like "UTC+8" or "UTC-5". */
export function getUtcOffset(tz?: string): string {
  const zone = tz || detectTimezone()
  try {
    const now = new Date()
    // Create a date string in the target timezone and parse the offset
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      timeZoneName: 'longOffset',
    })
    const parts = formatter.formatToParts(now)
    const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value || ''
    return offsetPart || zone
  } catch {
    return zone
  }
}

// ─── Formatters ────────────────────────────────────────────────────────────

/** Format a Date or ISO string to local date string: "May 13, 2026" */
export function formatDate(input: Date | string, tz?: string): string {
  const zone = tz || detectTimezone()
  const d = typeof input === 'string' ? new Date(input.endsWith('Z') || input.includes('+') ? input : `${input}Z`) : input
  return d.toLocaleDateString('en-US', { timeZone: zone, year: 'numeric', month: 'short', day: 'numeric' })
}

/** Format a Date or ISO string to local time string: "9:46 AM" */
export function formatTime(input: Date | string, tz?: string): string {
  const zone = tz || detectTimezone()
  const d = typeof input === 'string' ? new Date(input.endsWith('Z') || input.includes('+') ? input : `${input}Z`) : input
  return d.toLocaleTimeString('en-US', { timeZone: zone, hour: 'numeric', minute: '2-digit', hour12: true })
}

/** Format a Date or ISO string to full local datetime: "May 13, 2026 9:46 AM" */
export function formatDateTime(input: Date | string, tz?: string): string {
  const zone = tz || detectTimezone()
  const d = typeof input === 'string' ? new Date(input.endsWith('Z') || input.includes('+') ? input : `${input}Z`) : input
  return d.toLocaleString('en-US', {
    timeZone: zone,
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

/** Format a Date or ISO string to compact datetime for stamps: "2026-05-13 09:46 AM" */
export function formatStampDateTime(input: Date | string, tz?: string): string {
  const zone = tz || detectTimezone()
  const d = typeof input === 'string' ? new Date(input.endsWith('Z') || input.includes('+') ? input : `${input}Z`) : input
  const datePart = d.toLocaleDateString('en-CA', { timeZone: zone }) // YYYY-MM-DD
  const timePart = d.toLocaleTimeString('en-US', {
    timeZone: zone,
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
  return `${datePart}  ${timePart}`
}

/** Get the current local date/time as a formatted string for UI display. */
export function nowLocal(tz?: string): string {
  return formatDateTime(new Date(), tz)
}

/** Get the current local time as a short string. */
export function nowLocalTime(tz?: string): string {
  return formatTime(new Date(), tz)
}
