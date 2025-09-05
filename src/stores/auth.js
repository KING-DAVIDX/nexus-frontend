import { writable } from 'svelte/store'
import { supabase } from '../lib/supabaseClient'

export const user = writable(null)
export const isAuthenticated = writable(false)

// Check for existing session on page load
supabase.auth.getSession().then(({ data }) => {
  if (data.session) {
    user.set(data.session.user)
    isAuthenticated.set(true)
  }
})

// Listen for auth changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    user.set(session.user)
    isAuthenticated.set(true)
  } else if (event === 'SIGNED_OUT') {
    user.set(null)
    isAuthenticated.set(false)
  }
})