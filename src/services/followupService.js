import { supabase } from './supabase'

const TABLE = 'contact_followups'
const CONTACTS_TABLE = 'commercial_contacts'

const CONTACT_JOIN = `
  *,
  commercial_contacts (
    cliente,
    empresa,
    telefono,
    producto,
    vendedor
  )
`

function flattenContact(f) {
  const cc = f.commercial_contacts ?? {}
  return {
    ...f,
    commercial_contacts: undefined,
    cliente: cc.cliente,
    empresa: cc.empresa,
    telefono: cc.telefono,
    producto: cc.producto,
    vendedor: cc.vendedor,
  }
}

export const followupService = {
  async getFollowupsByContact(contactId) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('contact_id', contactId)
      .order('scheduled_date', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async getPendingFollowups(vendedor = null) {
    let query = supabase
      .from(TABLE)
      .select(CONTACT_JOIN)
      .eq('status', 'pendiente')
      .order('scheduled_date', { ascending: true })

    if (vendedor) query = query.eq('created_by', vendedor)

    const { data, error } = await query
    if (error) throw error
    return (data ?? []).map(flattenContact)
  },

  // Returns map: contact_id → nearest pending followup (for ContactTable column)
  async getPendingFollowupMap() {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, contact_id, scheduled_date, action_type')
      .eq('status', 'pendiente')
      .order('scheduled_date', { ascending: true })
    if (error) throw error
    const map = {}
    for (const f of data ?? []) {
      if (!map[f.contact_id]) map[f.contact_id] = f
    }
    return map
  },

  async getHistoryFollowups({ fechaDesde, fechaHasta } = {}) {
    let query = supabase
      .from(TABLE)
      .select(CONTACT_JOIN)
      .in('status', ['completado', 'cancelado'])
      .order('completed_at', { ascending: false })

    if (fechaDesde) query = query.gte('completed_at', fechaDesde + 'T00:00:00')
    if (fechaHasta) query = query.lte('completed_at', fechaHasta + 'T23:59:59')

    const { data, error } = await query
    if (error) throw error
    return (data ?? []).map(flattenContact)
  },

  async createFollowup({ contact_id, scheduled_date, action_type, note, created_by }) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        contact_id,
        scheduled_date,
        action_type,
        note: note || null,
        status: 'pendiente',
        created_by,
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single()
    if (error) throw error
    return data
  },

  async completeFollowup(id, { result_note, completed_by, new_contact_status, contact_id }) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({
        status: 'completado',
        result_note,
        completed_at: new Date().toISOString(),
        completed_by,
      })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error

    if (new_contact_status && new_contact_status !== 'no_cambiar' && contact_id) {
      await supabase
        .from(CONTACTS_TABLE)
        .update({ estado: new_contact_status })
        .eq('id', contact_id)
    }

    return data
  },

  async cancelFollowup(id, completed_by) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({
        status: 'cancelado',
        completed_at: new Date().toISOString(),
        completed_by,
      })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return data
  },
}
