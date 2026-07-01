import { supabase } from './supabase'
import { NOMINATIM_URL } from '@/utils/constants'

export async function getDeliveryZones(clientId) {
  const { data, error } = await supabase
    .from('client_delivery_zones')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function getAllDeliveryZones() {
  const { data, error } = await supabase
    .from('client_delivery_zones')
    .select(`
      *,
      commercial_clients (id, name, company, type, status, coordinates)
    `)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function addDeliveryZone({ client_id, city, province, created_by }) {
  const query = province ? `${city}, ${province}, Argentina` : `${city}, Argentina`
  const res = await fetch(
    `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=ar`,
    { headers: { 'Accept-Language': 'es' } }
  )
  const results = await res.json()

  if (!results.length) throw new Error(`No se encontró "${city}" — intentá agregar la provincia`)

  const coordinates = {
    lat: parseFloat(results[0].lat),
    lng: parseFloat(results[0].lon),
  }

  const { data, error } = await supabase
    .from('client_delivery_zones')
    .insert({ client_id, city, province, coordinates, created_by })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteDeliveryZone(id) {
  const { error } = await supabase
    .from('client_delivery_zones')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function toggleDelivery(clientId, hasDelivery) {
  const { error } = await supabase
    .from('commercial_clients')
    .update({ has_delivery: hasDelivery })
    .eq('id', clientId)
  if (error) throw error
}
