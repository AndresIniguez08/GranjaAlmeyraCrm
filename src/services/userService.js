import { supabase } from './supabase'

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`

async function callFunction(action, payload = {}) {
  const { data: { session } } = await supabase.auth.getSession()

  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  })

  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json.data
}

export const userService = {
  listUsers: () => callFunction('list_users'),

  createUser: (username, name, role, password) =>
    callFunction('create_user', { username, name, role, password }),

  updateUser: (userId, name, role) =>
    callFunction('update_user', { userId, name, role }),

  toggleUser: (userId, active) =>
    callFunction('toggle_user', { userId, active }),

  resetPassword: (userId, newPassword) =>
    callFunction('reset_password', { userId, newPassword }),

  changeOwnPassword: (newPassword) =>
    callFunction('change_own_password', { newPassword }),

  deleteUser: (userId) =>
    callFunction('delete_user', { userId }),
}
