import { supabase } from './supabase'

const TABLE = 'commercial_contacts'

export const contactService = {
  async getAll({ page = 1, pageSize = 20, filters = {} } = {}) {
    const offset = (page - 1) * pageSize

    let query = supabase
      .from(TABLE)
      .select('*', { count: 'exact' })
      .order('fecha', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (filters.vendedor) query = query.eq('vendedor', filters.vendedor)
    if (filters.estado) query = query.eq('estado', filters.estado)
    if (filters.producto) query = query.eq('producto', filters.producto)
    if (filters.fechaDesde) query = query.gte('fecha', filters.fechaDesde)
    if (filters.fechaHasta) query = query.lte('fecha', filters.fechaHasta)
    if (filters.search) {
      query = query.or(
        `cliente.ilike.%${filters.search}%,empresa.ilike.%${filters.search}%`
      )
    }

    const { data, error, count } = await query
    if (error) throw error
    return { data: data ?? [], count: count ?? 0 }
  },

  async getAllForExport(filters = {}) {
    let query = supabase
      .from(TABLE)
      .select('*')
      .order('fecha', { ascending: false })

    if (filters.vendedor) query = query.eq('vendedor', filters.vendedor)
    if (filters.estado) query = query.eq('estado', filters.estado)
    if (filters.producto) query = query.eq('producto', filters.producto)
    if (filters.fechaDesde) query = query.gte('fecha', filters.fechaDesde)
    if (filters.fechaHasta) query = query.lte('fecha', filters.fechaHasta)
    if (filters.search) {
      query = query.or(
        `cliente.ilike.%${filters.search}%,empresa.ilike.%${filters.search}%`
      )
    }

    const { data, error } = await query
    if (error) throw error
    return data ?? []
  },

  async getAllForReports(filters = {}) {
    let query = supabase
      .from(TABLE)
      .select('fecha, estado, vendedor, producto, cliente_derivado, empresa')
      .order('fecha', { ascending: true })

    if (filters.fechaDesde) query = query.gte('fecha', filters.fechaDesde)
    if (filters.fechaHasta) query = query.lte('fecha', filters.fechaHasta)

    const { data, error } = await query
    if (error) throw error
    return data ?? []
  },

  async create(contact) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert(contact)
      .select('*')
      .single()
    if (error) throw error
    return data
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from(TABLE)
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return data
  },

  async delete(id) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw error
  },

  async getPendingFollowupsByContacts(contactIds) {
    if (!contactIds?.length) return {}
    const { data, error } = await supabase
      .from('contact_followups')
      .select('contact_id, scheduled_date, action_type')
      .in('contact_id', contactIds)
      .eq('status', 'pendiente')
      .order('scheduled_date', { ascending: true })

    if (error) throw error

    const map = {}
    data.forEach(f => {
      if (!map[f.contact_id]) map[f.contact_id] = f
    })
    return map
  },
}
