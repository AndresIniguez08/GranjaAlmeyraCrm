import { supabase } from './supabase'
import { AUTH_EMAIL_DOMAIN } from '@/utils/constants'

function toEmail(username) {
  return username.trim().toLowerCase() + AUTH_EMAIL_DOMAIN
}

export const authService = {
  async login(username, password) {
    const email = toEmail(username)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session
  },

  onAuthChange(callback) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session)
    })
  },
}
