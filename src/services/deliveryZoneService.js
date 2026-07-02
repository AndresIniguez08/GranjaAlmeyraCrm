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

const DEFAULT_RADIUS = 8000
const MIN_RADIUS = 3000
const MAX_RADIUS = 20000
const METERS_PER_DEGREE = 111000

async function geocodeCity(city, province) {
  const query = province ? `${city}, ${province}, Argentina` : `${city}, Argentina`
  const res = await fetch(
    `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=ar`,
    { headers: { 'Accept-Language': 'es' } }
  )
  const results = await res.json()
  if (!results.length) return null
  return results[0]
}

// Radio = mitad de la diagonal del bounding box que devuelve Nominatim,
// acotado entre MIN_RADIUS y MAX_RADIUS para evitar círculos absurdos
// en localidades muy chicas o con bounding box mal definido.
function radiusFromBoundingBox(lat, boundingbox) {
  if (!boundingbox) return DEFAULT_RADIUS
  const [latMin, latMax, lngMin, lngMax] = boundingbox.map(parseFloat)

  const latMeters = Math.abs(latMax - latMin) * METERS_PER_DEGREE
  const lngMeters = Math.abs(lngMax - lngMin) * METERS_PER_DEGREE * Math.cos(lat * Math.PI / 180)
  const diagonal = Math.sqrt(latMeters ** 2 + lngMeters ** 2)

  return Math.round(Math.min(Math.max(diagonal / 2, MIN_RADIUS), MAX_RADIUS))
}

export async function addDeliveryZone({ client_id, city, province, created_by }) {
  const result = await geocodeCity(city, province)
  if (!result) throw new Error(`No se encontró "${city}" — intentá agregar la provincia`)

  const coordinates = {
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
  }
  const radius = radiusFromBoundingBox(coordinates.lat, result.boundingbox)

  const { data, error } = await supabase
    .from('client_delivery_zones')
    .insert({ client_id, city, province, coordinates, radius, created_by })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function recalculateZoneRadius(zoneId, city, province) {
  const result = await geocodeCity(city, province)
  if (!result) return DEFAULT_RADIUS

  const lat = parseFloat(result.lat)
  const radius = radiusFromBoundingBox(lat, result.boundingbox)

  const { error } = await supabase
    .from('client_delivery_zones')
    .update({ radius })
    .eq('id', zoneId)
  if (error) throw error

  return radius
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
