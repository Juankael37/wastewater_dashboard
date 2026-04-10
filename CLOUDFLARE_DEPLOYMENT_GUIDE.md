# Cloudflare Workers Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the Wastewater Monitoring API to Cloudflare Workers. Cloudflare Workers provides serverless functions that run at the edge, offering zero-cost deployment for low-traffic applications.

## Prerequisites

1. **Cloudflare Account**: Sign up at [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
2. **Wrangler CLI**: Cloudflare's command-line tool
3. **Node.js**: Version 18 or higher
4. **Git**: For version control

## Step 1: Install Wrangler CLI

```bash
# Install globally
npm install -g wrangler

# Or install locally in the api directory
cd api
npm install wrangler
```

## Step 2: Login to Cloudflare

```bash
# Login to Cloudflare
wrangler login

# This will open a browser window for authentication
```

## Step 3: Configure environment variables

The Worker reads **Cloudflare bindings** on `c.env` (not `process.env`).

1. Edit `api/wrangler.toml` and set **`SUPABASE_URL`** to your project URL (safe to keep as a plain var).
2. Set the **anon key** as a **secret** (do not commit it):
   ```bash
   cd api
   npx wrangler secret put SUPABASE_ANON_KEY
   ```
3. **CORS:** set **`ALLOWED_ORIGINS`** in `[vars]` to a comma-separated list (e.g. `http://localhost:5173,https://your-app.pages.dev`).
4. Local dev: copy `api/.dev.vars.example` → **`api/.dev.vars`** and fill in real values (`wrangler dev` loads this file).

Default `wrangler.toml` is minimal (no custom routes, no KV) so **`wrangler deploy` works on `*.workers.dev`** out of the box. Add routes/KV/crons later if you need them.

## Step 4: API code note

`api/src/index.js` creates a Supabase client per request from `c.env.SUPABASE_URL` and `c.env.SUPABASE_ANON_KEY`. `GET /` returns **`supabase_configured: true/false`** so you can confirm vars/secrets are wired.

## Step 5: Test locally

```bash
# Navigate to api directory
cd api

# Install dependencies
npm install

# Start local development server
wrangler dev

# The API will be available at http://localhost:8787
```

## Step 6: Deploy to Cloudflare Workers

### Option A: Deploy to workers.dev (Free)
```bash
# Deploy to workers.dev subdomain
wrangler deploy

# Your API will be available at: https://wastewater-api.your-username.workers.dev
```

### Option B: Deploy to Custom Domain
1. Add your domain in Cloudflare dashboard
2. Update `wrangler.toml` with your domain
3. Deploy:
```bash
wrangler deploy
```

## Step 7: Configure CORS

CORS allowed origins come from the **`ALLOWED_ORIGINS`** variable in `wrangler.toml` (comma-separated). Update it when you deploy the frontend (e.g. Cloudflare Pages URL) and redeploy the Worker.

## Step 8: Update Frontend API Configuration

Update the frontend to use your deployed API:

### `frontend/.env.development`
```env
VITE_API_URL=http://localhost:8787  # For local development
```

### `frontend/.env.production`
```env
VITE_API_URL=https://wastewater-api.your-username.workers.dev
# or
VITE_API_URL=https://api.your-domain.com
```

## Step 9: Test the Deployed API

1. **Health Check**: Visit your API URL in browser
   - Example: `https://wastewater-api.your-username.workers.dev`
   - Should return JSON including `"status":"healthy"` and `"supabase_configured":true` once URL + anon secret are set.

2. **Test Authentication**:
   ```bash
   curl -X POST https://wastewater-api.your-username.workers.dev/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

3. **Test Measurements Endpoint** (with auth token):
   ```bash
   curl -X GET https://wastewater-api.your-username.workers.dev/measurements \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

## Step 10: Set Up Cron Jobs (Optional)

The API is configured with cron triggers for hourly and daily tasks:

- `0 * * * *`: Run every hour (for alert checks)
- `0 0 * * *`: Run daily at midnight (for report generation)

To enable cron jobs, you need to deploy with triggers:

```bash
wrangler deploy --env production
```

## Step 11: Monitor and Debug

### View Logs
```bash
# Tail logs in real-time
wrangler tail

# View specific number of logs
wrangler tail --num-events 100
```

### Cloudflare Dashboard
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **Overview**
3. Select your worker to view:
   - Analytics (requests, errors, duration)
   - Logs
   - Settings
   - Triggers

## Step 12: Set Up KV Namespace (Optional)

For caching or storing temporary data:

1. Create KV namespace:
```bash
wrangler kv:namespace create "CACHE"
```

2. Update `wrangler.toml` with the generated IDs
3. Use in your code:
```javascript
// In your API endpoints
await env.CACHE.put('key', 'value')
const value = await env.CACHE.get('key')
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: 
   - Check CORS configuration in API
   - Verify frontend URL is in allowed origins
   - Test with `curl -v` to see CORS headers

2. **Authentication Failures**:
   - Verify Supabase credentials
   - Check JWT token expiration
   - Test Supabase connection separately

3. **Deployment Failures**:
   - Check `wrangler.toml` syntax
   - Verify Cloudflare login status
   - Check for syntax errors in code

4. **Cold Starts**:
   - Workers may have cold starts (up to 1-2 seconds)
   - Consider using Durable Objects for stateful applications

### Free Tier Limits

- **Requests**: 100,000 requests/day
- **CPU Time**: 10ms per request (free tier)
- **Memory**: 128MB per request
- **Script Size**: 1MB
- **KV**: 1GB storage, 100,000 reads/day, 1,000 writes/day

Monitor usage in Cloudflare dashboard to stay within limits.

## Security Considerations

1. **Environment Variables**: Never commit secrets to git
2. **API Keys**: Use different keys for development and production
3. **Rate Limiting**: Implement rate limiting for public endpoints
4. **Input Validation**: Always validate and sanitize user input
5. **Error Handling**: Don't expose sensitive error details

## Next Steps

After successful deployment:

1. **Set up CI/CD**: Automate deployments with GitHub Actions
2. **Implement monitoring**: Set up alerts for errors
3. **Performance optimization**: Optimize database queries
4. **Scale as needed**: Upgrade plan if traffic increases

## Support Resources

- Cloudflare Workers Docs: https://developers.cloudflare.com/workers/
- Wrangler CLI Docs: https://developers.cloudflare.com/workers/wrangler/
- Community Forum: https://community.cloudflare.com/
- Discord: https://discord.cloudflare.com/