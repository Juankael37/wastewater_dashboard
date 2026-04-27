/**
 * Role mapping utilities — maps Supabase/database role strings to the
 * canonical application roles used throughout the frontend.
 */

export type AppRole = 'admin' | 'operator' | 'client'

/** Map a raw API user object to a canonical frontend role. */
export const getRoleFromUser = (apiUser: any): AppRole => {
  const rawRole = apiUser?.user_metadata?.role || apiUser?.profile?.role || 'operator'
  if (rawRole === 'admin' || rawRole === 'company_admin') return 'admin'
  if (rawRole === 'client' || rawRole === 'viewer') return 'client'
  if (rawRole === 'operator' || rawRole === 'company_operator') return 'operator'
  return 'operator'
}

/** Extract a display name from an API user object. */
export const getDisplayName = (apiUser: any): string => {
  return (
    apiUser?.profile?.full_name ||
    apiUser?.user_metadata?.full_name ||
    apiUser?.email ||
    'user'
  )
}
