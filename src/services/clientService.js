import { supabase } from './supabase'
import { logDeletion } from './auditService'
import { NOMINATIM_URL, NOMINATIM_DELAY_MS } from '@/utils/constants'

const TABLE = 'commercial_clients'

export const clientService = {
  async getAll({ page = 1, pageSize = 20, filters = {} } = {}) {
    const offset = (page - 1) * pageSize

    let query = supabase
      .from(TABLE)
      .select('*', { count: 'exact' })
      .order('company', { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (filters.type) query = query.eq('type', filters.type)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,company.ilike.%${filters.search}%`
      )
    }

    const { data, error, count } = await query
    if (error) throw error
    return { data: data ?? [], count: count ?? 0 }
  },

  async getAllForMap() {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, name, company, phone, type, status, address, coordinates')
      .order('company', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async getAllForReports() {
    const { data, error } = await supabase
      .from(TABLE)
      .select('type, status, registered_at')
    if (error) throw error
    return data ?? []
  },

  async getAllForSelect() {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, name, company')
      .order('company', { ascending: true })
    if (error) throw error
    return data ?? []
  },

  async create(client) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert(client)
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

  async delete(id, performedBy) {
    const { data: client } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .single()

    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw error

    await logDeletion({
      entity_type: 'client',
      entity_id: id,
      entity_data: client,
      performed_by: performedBy,
    })
  },

  async geocodeAddress(address) {
    const query = address.toLowerCase().includes('argentina')
      ? address
      : `${address}, Argentina`
    const url =
      `${NOMINATIM_URL}?q=${encodeURIComponent(query)}` +
      `&format=json&limit=1&countrycodes=ar`
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'es' },
    })
    if (!res.ok) throw new Error('Error al geocodificar')
    const data = await res.json()
    if (!data.length) return null
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    }
  },

  async geocodeWithDelay(address) {
    await new Promise(r => setTimeout(r, NOMINATIM_DELAY_MS))
    return this.geocodeAddress(address)
  },
}
