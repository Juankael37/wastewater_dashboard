/**
 * Supabase browser client — used for client-side token verification
 * (verifyOtp) on the /auth/confirm page. The rest of the app authenticates
 * through the Cloudflare Worker; this client only needs the anon key.
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
})
