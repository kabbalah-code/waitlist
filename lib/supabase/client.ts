import { createBrowserClient } from '@supabase/ssr'

let supabaseClient: any = null

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return supabaseClient
}

export async function initializeSession(sessionData: any) {
  const supabase = getSupabaseClient()
  
  try {
    const { data, error } = await supabase.auth.setSession({
      access_token: sessionData.access_token,
      refresh_token: sessionData.refresh_token
    })
    
    if (error) {
      console.error('[Supabase] Session initialization error:', error)
      return false
    }
    
    console.log('[Supabase] Session initialized successfully')
    return true
  } catch (error) {
    console.error('[Supabase] Session initialization failed:', error)
    return false
  }
}

export async function getSession() {
  const supabase = getSupabaseClient()
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('[Supabase] Get session error:', error)
      return null
    }
    
    return session
  } catch (error) {
    console.error('[Supabase] Get session failed:', error)
    return null
  }
}

export async function signOut() {
  const supabase = getSupabaseClient()
  
  try {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('[Supabase] Sign out error:', error)
      return false
    }
    
    console.log('[Supabase] Signed out successfully')
    return true
  } catch (error) {
    console.error('[Supabase] Sign out failed:', error)
    return false
  }
}