/**
 * Optional append of a measurement row to Google Sheets (service account + REST).
 * Set GOOGLE_SHEETS_ID (var) + GOOGLE_SERVICE_ACCOUNT_JSON (secret, full JSON).
 */

import { SignJWT, importPKCS8 } from 'jose'

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets'

export function isSheetsBackupConfigured(env) {
  const id = env.GOOGLE_SHEETS_ID?.trim?.() ?? env.GOOGLE_SHEETS_ID
  const json = env.GOOGLE_SERVICE_ACCOUNT_JSON
  return Boolean(id && json && String(json).trim().length > 0)
}

async function getAccessToken(credentials) {
  const now = Math.floor(Date.now() / 1000)
  const pk = await importPKCS8(credentials.private_key, 'RS256')

  const jwt = await new SignJWT({ scope: SHEETS_SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(credentials.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(pk)

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  })

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error_description || data.error || `oauth ${res.status}`)
  }
  if (!data.access_token) {
    throw new Error('no access_token from Google OAuth')
  }
  return data.access_token
}

/**
 * @param {*} env - Worker bindings (SUPABASE_*, GOOGLE_*)
 * @param {object} opts
 * @param {object} opts.measurement - row from Supabase insert (with joined plants/parameters)
 * @param {string} [opts.operatorEmail]
 */
export async function appendMeasurementRow(env, { measurement, operatorEmail }) {
  if (!isSheetsBackupConfigured(env)) {
    return { skipped: true }
  }

  let credentials
  try {
    credentials = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON)
  } catch (e) {
    console.error('[sheets] invalid GOOGLE_SERVICE_ACCOUNT_JSON', e)
    return { error: 'invalid_service_account_json' }
  }

  const plants = measurement.plants
  const parameters = measurement.parameters
  const plantName = plants?.name ?? ''
  const paramLabel = parameters?.display_name || parameters?.name || ''
  const unit = parameters?.unit ?? ''
  const type = measurement.type ?? ''
  const ts = measurement.timestamp ?? new Date().toISOString()

  const row = [
    ts,
    plantName,
    paramLabel,
    String(measurement.value ?? ''),
    unit,
    type,
    operatorEmail ?? '',
    '',
    '',
    '',
    '',
    measurement.notes ?? '',
    new Date().toISOString(),
  ]

  const range = encodeURIComponent(env.GOOGLE_SHEETS_RANGE || 'Sheet1!A:M')
  const spreadsheetId = env.GOOGLE_SHEETS_ID.trim()

  try {
    const accessToken = await getAccessToken(credentials)
    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [row] }),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`sheets HTTP ${res.status}: ${errText}`)
    }

    return { ok: true }
  } catch (e) {
    console.error('[sheets] append failed:', e?.message || e)
    return { error: e?.message || String(e) }
  }
}
