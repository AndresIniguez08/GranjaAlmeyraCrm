import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar que el usuario que llama es admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No autorizado')

    // Cliente con anon key para verificar el usuario llamante
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: caller } } = await supabaseClient.auth.getUser()
    if (!caller) throw new Error('No autorizado')

    const callerRole = caller.user_metadata?.role

    // Cliente admin con service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, ...payload } = await req.json()

    // Solo admins pueden hacer todo excepto cambiar su propia contraseña
    if (action !== 'change_own_password' && callerRole !== 'admin') {
      throw new Error('Solo administradores pueden gestionar usuarios')
    }

    let result

    switch (action) {

      case 'list_users': {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers()
        if (error) throw error
        result = data.users.map(u => ({
          id: u.id,
          username: u.email?.replace('@crm.internal', ''),
          name: u.user_metadata?.name,
          role: u.user_metadata?.role,
          active: !u.banned_until,
          created_at: u.created_at,
          last_sign_in: u.last_sign_in_at,
        }))
        break
      }

      case 'create_user': {
        const { username, name, role, password } = payload
        const email = `${username.toLowerCase()}@crm.internal`
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name, role },
        })
        if (error) throw error
        result = data.user
        break
      }

      case 'update_user': {
        const { userId, name, role } = payload
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { user_metadata: { name, role } }
        )
        if (error) throw error
        result = data.user
        break
      }

      case 'toggle_user': {
        const { userId, active } = payload
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { ban_duration: active ? 'none' : '876600h' }
        )
        if (error) throw error
        result = data.user
        break
      }

      case 'reset_password': {
        const { userId, newPassword } = payload
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { password: newPassword }
        )
        if (error) throw error
        result = { success: true }
        break
      }

      case 'change_own_password': {
        const { newPassword } = payload
        const { error } = await supabaseClient.auth.updateUser({ password: newPassword })
        if (error) throw error
        result = { success: true }
        break
      }

      case 'delete_user': {
        const { userId } = payload
        if (userId === caller.id) throw new Error('No podés eliminar tu propio usuario')
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
        if (error) throw error
        result = { success: true }
        break
      }

      default:
        throw new Error(`Acción desconocida: ${action}`)
    }

    return new Response(
      JSON.stringify({ data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
