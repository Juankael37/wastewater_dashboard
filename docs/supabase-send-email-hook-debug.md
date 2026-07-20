# Supabase Send Email Auth Hook — "Hook requires authorization token" Debug

## Symptom
Signup via the production app (`https://wilc.ortuma.site`) failed with:
```json
{ "error": "Hook requires authorization token", "code": "AUTH_REGISTER_FAILED" }
```
Supabase fell back to native email send, which then hit the 2-emails/hour rate limit (`429`).

## Root Cause (multiple issues — all fixed)

### 1. Supabase bug: unsigned hook requests
Known Supabase bug: **[supabase/auth#2499](https://github.com/supabase/auth/issues/2499)** —
"send_email Auth Hook does not attach Authorization header despite signing secret being configured."

- GoTrue does NOT attach the `webhook-signature` / `webhook-id` / `webhook-timestamp` headers to `send_email` hook requests. It calls the hook **unsigned**.
- Our Worker rejected the unsigned request with `401 Invalid signature`.
- Evidence: `wrangler tail` captured **zero** `[send-email-hook]` request lines, consistent with the request arriving without the signature header (verify throws immediately).

### 2. Wrong secret normalization
Supabase generates secrets in the format `v1,whsec_<base64>`. The code was only stripping `whsec_` but **not** the `v1,` prefix, so even when signature headers WERE present, the `standardwebhooks` Webhook constructor received an invalid base64 string and always failed.

**Fix**: `rawSecret.trim().replace(/^v1,/, '').replace(/^whsec_/, '')`

### 3. Wrong error response format
GoTrue expects hook errors in the format `{ "error": { "http_code": N, "message": "..." } }` (nested object). The code was returning `{ "error": "string" }` (flat string), which GoTrue could not parse — it fell back to the generic "Hook requires authorization token" catch-all message for ANY non-parseable hook response.

**Fix**: All error returns now use `{ error: { http_code: N, message: "..." } }` format.

### 4. Non-200 HTTP status codes
GoTrue treats ANY non-2xx HTTP response from the hook as a failure and shows the generic error. The code was returning 400/401/500/502 status codes on various error paths.

**Fix**: All responses (success AND error) now return HTTP 200. Errors are communicated through the JSON body using the `error` object, which GoTrue parses and propagates correctly.

The message "Hook requires authorization token" is a generic catch-all Supabase shows for ANY non-2xx / unparseable hook response — it does NOT specifically mean the secret is wrong.

## Fixes Applied
File: `api/src/routes/emailHook.js`

### Workaround for unsigned requests (supabase/auth#2499)
The handler only enforces `standardwebhooks` signature verification **when the `webhook-signature` header is present**. If the header is missing (the bug case), it logs a warning and proceeds with the parsed JSON body.

```js
if (!headers['webhook-signature']) {
  console.warn('[send-email-hook] WARNING: no webhook-signature header present (supabase/auth#2499) — accepting unsigned request')
  payload = JSON.parse(rawBodyPre)
} else {
  const wh = new Webhook(secret)
  payload = wh.verify(rawBodyPre, headers)
}
```

### Secret normalization (strips both prefixes)
```js
const secret = rawSecret.trim().replace(/^v1,/, '').replace(/^whsec_/, '')
```

### GoTrue-compatible error format (always HTTP 200)
```js
// Success
return c.json({}, 200)

// Error — GoTrue parses the nested error object and propagates http_code + message
return c.json({ error: { http_code: 502, message: 'Resend send failed: ...' } }, 200)
```

### Other hardening (added during debugging)
- Entire handler wrapped in try/catch → returns `200` with GoTrue error format on any unhandled error.
- Success returns `200` + `Content-Type: application/json` + `{}` (empty object, not empty body).
- Diagnostic log at top of handler: method, presence of webhook headers, content-length.
- Log after signature verification and full Resend response (status + body).

## Body-read order (important)
The raw body is read exactly **once**, via `await c.req.text()` at the very top into `rawBodyPre`, BEFORE any JSON parsing or verification. That same string is passed to `wh.verify(rawBodyPre, headers)`. Never call `c.req.json()` and never read the body twice.

## Secret normalization
`standardwebhooks` Webhook constructor expects the secret WITHOUT the `v1,whsec_` prefix. Code does:
```js
const secret = rawSecret.trim().replace(/^v1,/, '').replace(/^whsec_/, '')
```
The `v1,` is a Supabase version tag. The `whsec_` is the standardwebhooks prefix. Stray whitespace/newlines from pasting break base64 decoding — always trim.

## How to verify the fix
1. Deploy the Worker:
   ```powershell
   cd api
   npx wrangler deploy
   ```
2. Tail the Worker:
   ```powershell
   cd api
   npx wrangler tail wastewater-api --format pretty
   ```
3. Trigger a fresh signup (new email) on `https://wilc.ortuma.site`.
4. Expect to see:
   - `[send-email-hook] request received`
   - `[send-email-hook] WARNING: no webhook-signature header...` (or `signature verified` if Supabase fixes #2499)
   - `[send-email-hook] Resend response { status: 200, ... }`
   - `[send-email-hook] email sent to <email>`
   - Signup returns success (no `AUTH_REGISTER_FAILED`).

## Security Note
While the workaround is active, the hook accepts unsigned requests. If the Worker URL is publicly reachable, restrict it (e.g., source IP / WAF) or re-enable strict verification once Supabase fixes #2499.

## Relevant files
- `api/src/routes/emailHook.js` — the hook endpoint (signature verify + Resend send).
- `api/src/index.js` — mounts `emailHookRoutes` at `/auth`.
- `api/wrangler.toml` — `PUBLIC_APP_URL = "https://wilc.ortuma.site"`.
- `frontend/src/pages/auth/VerifyEmailPage.tsx` — `verifyOtp` confirm page.
- `frontend/src/services/supabaseClient.ts` — anon supabase client for `verifyOtp`.
- Supabase dashboard: Authentication → Hooks → Send Email (manual config).
- Cloudflare dashboard: wastewater-api → Settings → Variables → `SEND_EMAIL_HOOK_SECRET` (manual).

## Worker deployment
```powershell
cd api
npx wrangler deploy
```
Current production URL: `https://wastewater-api.juankael37.workers.dev/auth/send-email-hook`

