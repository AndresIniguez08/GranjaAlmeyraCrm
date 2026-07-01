import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Circle, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { clientService } from '@/services/clientService'
import { getAllDeliveryZones } from '@/services/deliveryZoneService'
import { TIPO_COLORS } from '@/utils/constants'
import { cleanPhoneForWhatsApp } from '@/utils/formatters'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

const ARGENTINA_CENTER = [-34.6037, -58.3816]
const DEFAULT_ZOOM = 6
const ZONE_RADIUS_M = 15000

const DELIVERY_COLORS = [
  '#EF4444',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#F97316',
  '#06B6D4',
  '#EC4899',
  '#84CC16',
  '#6366F1',
  '#14B8A6',
  '#DC2626',
]

// ── Controla zoom + vista cuando focusClient cambia ───────────────────────────

function MapController({ focusClient }) {
  const map = useMap()

  useEffect(() => {
    if (focusClient?.coordinates?.lat && focusClient?.coordinates?.lng) {
      const { lat, lng } = focusClient.coordinates
      map.setView([lat, lng], 15, { animate: true })
    }
  }, [focusClient, map])

  return null
}

// ── Leyenda clientes ──────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="absolute bottom-6 right-3 z-[1000] bg-white rounded-xl border border-gray-200 shadow-lg p-3 pointer-events-none">
      <p className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">Tipo</p>
      {Object.entries(TIPO_COLORS).map(([tipo, color]) => (
        <div key={tipo} className="flex items-center gap-2 mb-1 last:mb-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-xs text-gray-700">{tipo}</span>
        </div>
      ))}
    </div>
  )
}

// ── Leyenda zonas ─────────────────────────────────────────────────────────────

function ZonesLegend({ clientsWithDelivery, colorMap }) {
  return (
    <div className="absolute bottom-6 right-4 z-[1000] bg-white rounded-xl shadow-lg p-3 min-w-[180px]">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
        Zonas de reparto
      </p>
      {clientsWithDelivery.map(client => (
        <div key={client.id} className="flex items-center gap-2 mb-1.5">
          <div
            className="w-4 h-4 rounded-full flex-shrink-0 opacity-80"
            style={{ backgroundColor: colorMap[client.id] }}
          />
          <span className="text-xs text-gray-700 font-medium truncate">{client.name}</span>
        </div>
      ))}
      {clientsWithDelivery.length === 0 && (
        <p className="text-xs text-gray-400">Ningún cliente tiene zonas definidas aún</p>
      )}
    </div>
  )
}

// ── Íconos Leaflet ────────────────────────────────────────────────────────────

function makeDepotIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;
      background:#1E40AF;
      border:3px solid ${color};
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      font-size:14px;
    ">🏭</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function makeZoneIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:10px;height:10px;
      background:${color};
      border:2px solid white;
      border-radius:50%;
      box-shadow:0 1px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  })
}

// ── Helpers de zonas ─────────────────────────────────────────────────────────

function applyOffsets(zones) {
  const result = [...zones]
  const threshold = 0.05
  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      const a = result[i].coordinates
      const b = result[j].coordinates
      if (Math.abs(a.lat - b.lat) < threshold && Math.abs(a.lng - b.lng) < threshold) {
        result[j] = {
          ...result[j],
          coordinates: { lat: b.lat + 0.04, lng: b.lng + 0.04 },
        }
      }
    }
  }
  return result
}

function CityPopup({ zone, deliveryZones, colorMap }) {
  const zonesInSameCity = deliveryZones.filter(
    z => z.city.toLowerCase() === zone.city.toLowerCase()
  )
  return (
    <div className="text-sm min-w-[160px]">
      <p className="font-semibold text-gray-800 mb-2">
        📍 {zone.city}
        {zone.province && (
          <span className="text-gray-400 font-normal"> · {zone.province}</span>
        )}
      </p>
      <div className="space-y-1">
        {zonesInSameCity.map(z => (
          <div key={z.id} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: colorMap[z.client_id] }}
            />
            <span className="text-xs text-gray-700">{z.commercial_clients.name}</span>
            <span className="text-xs text-gray-400">{z.commercial_clients.type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── MapView ───────────────────────────────────────────────────────────────────

export function MapView({ filters, focusClient, mapView = 'clients' }) {
  // Vista clientes
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [geocodingCount, setGeocodingCount] = useState(0)
  const abortRef = useRef(false)
  const focusedMarkerRef = useRef(null)

  // Vista zonas
  const [deliveryZones, setDeliveryZones] = useState([])
  const [loadingZones, setLoadingZones] = useState(false)

  // ── Cargar clientes ────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapView !== 'clients') return
    abortRef.current = false
    setLoading(true)

    clientService.getAllForMap().then(async (all) => {
      let filtered = all
      if (filters?.type)   filtered = filtered.filter(c => c.type === filters.type)
      if (filters?.status) filtered = filtered.filter(c => c.status === filters.status)

      const withCoords    = filtered.filter(c => c.coordinates?.lat && c.coordinates?.lng)
      const withoutCoords = filtered.filter(c => !(c.coordinates?.lat && c.coordinates?.lng) && c.address)

      if (focusClient?.coordinates?.lat && !withCoords.some(c => c.id === focusClient.id)) {
        withCoords.push(focusClient)
      }

      setClients(withCoords)
      setLoading(false)

      if (withoutCoords.length === 0) return
      setGeocodingCount(withoutCoords.length)

      for (const client of withoutCoords) {
        if (abortRef.current) break
        const coords = await clientService.geocodeWithDelay(client.address)
        if (abortRef.current) break
        if (coords) {
          setClients(prev => [...prev, { ...client, coordinates: coords }])
          clientService.update(client.id, { coordinates: coords }).catch(() => {})
        }
        setGeocodingCount(prev => Math.max(0, prev - 1))
      }
      setGeocodingCount(0)
    }).catch(() => setLoading(false))

    return () => { abortRef.current = true }
  }, [filters, mapView]) // eslint-disable-line

  // ── Cargar zonas de reparto ────────────────────────────────────────────────
  useEffect(() => {
    if (mapView !== 'zones') return
    setLoadingZones(true)
    getAllDeliveryZones()
      .then(setDeliveryZones)
      .catch(() => {})
      .finally(() => setLoadingZones(false))
  }, [mapView])

  // ── Abrir popup cliente enfocado ───────────────────────────────────────────
  useEffect(() => {
    if (!focusClient || loading) return
    const timer = setTimeout(() => {
      focusedMarkerRef.current?.openPopup()
    }, 600)
    return () => clearTimeout(timer)
  }, [focusClient, loading])

  // ── Calcular grupos de zonas ───────────────────────────────────────────────
  const zoneGroups = (() => {
    const clientMap = new Map()
    for (const zone of deliveryZones) {
      const c = zone.commercial_clients
      if (!c) continue
      if (!clientMap.has(c.id)) clientMap.set(c.id, { client: c, zones: [] })
      clientMap.get(c.id).zones.push(zone)
    }
    return Array.from(clientMap.values())
  })()

  const clientsWithDelivery = zoneGroups.map(g => g.client)

  const colorMap = (() => {
    const uniqueIds = [...new Set(deliveryZones.map(z => z.client_id))]
    const map = {}
    uniqueIds.forEach((id, i) => { map[id] = DELIVERY_COLORS[i % DELIVERY_COLORS.length] })
    return map
  })()

  const zonesWithOffsets = applyOffsets(deliveryZones)

  if (loading && mapView === 'clients') {
    return (
      <div className="h-full w-full flex items-center justify-center bg-primary-50">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="h-full w-full relative">

      {geocodingCount > 0 && mapView === 'clients' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs text-amber-800 shadow-sm">
          Geocodificando {geocodingCount} dirección(es)…
        </div>
      )}

      {loadingZones && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-blue-800 shadow-sm">
          Cargando zonas de reparto…
        </div>
      )}

      <MapContainer
        center={ARGENTINA_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* ── Vista clientes ── */}
        {mapView === 'clients' && (
          <>
            <MapController focusClient={focusClient} />

            {clients.map(client => {
              const isFocused = focusClient && client.id === focusClient.id
              const color = TIPO_COLORS[client.type] ?? '#9CA3AF'
              const phone = cleanPhoneForWhatsApp(client.phone)

              return (
                <CircleMarker
                  key={client.id}
                  ref={isFocused ? focusedMarkerRef : undefined}
                  center={[client.coordinates.lat, client.coordinates.lng]}
                  radius={isFocused ? 12 : 8}
                  fillColor={color}
                  color={isFocused ? '#F59E0B' : '#fff'}
                  fillOpacity={0.9}
                  weight={isFocused ? 3 : 1.5}
                >
                  <Popup maxWidth={240}>
                    <div className="text-sm space-y-1">
                      <p className="font-bold text-gray-800">{client.name || client.company}</p>
                      {client.company && client.name && (
                        <p className="text-gray-500 text-xs">{client.company}</p>
                      )}
                      <p className="text-xs font-semibold" style={{ color }}>
                        {client.type}
                        {client.status && <span className="ml-1 text-gray-400 font-normal">· {client.status}</span>}
                      </p>
                      {client.address && (
                        <p className="text-gray-400 text-xs">{client.address}</p>
                      )}
                      {phone && (
                        <a
                          href={`https://api.whatsapp.com/send?phone=${phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-1 text-xs font-semibold text-green-600 hover:underline"
                        >
                          💬 WhatsApp
                        </a>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}
          </>
        )}

        {/* ── Vista zonas de reparto ── */}
        {mapView === 'zones' && zonesWithOffsets.map(zone => {
          const color = colorMap[zone.client_id] ?? '#9CA3AF'
          return (
            <Circle
              key={zone.id}
              center={[zone.coordinates.lat, zone.coordinates.lng]}
              radius={ZONE_RADIUS_M}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.12,
                weight: 2,
                opacity: 0.9,
              }}
            >
              <Popup>
                <CityPopup zone={zone} deliveryZones={deliveryZones} colorMap={colorMap} />
              </Popup>
            </Circle>
          )
        })}

        {mapView === 'zones' && zonesWithOffsets.map(zone => {
          const color = colorMap[zone.client_id] ?? '#9CA3AF'
          return (
            <Marker
              key={`zm-${zone.id}`}
              position={[zone.coordinates.lat, zone.coordinates.lng]}
              icon={makeZoneIcon(color)}
            >
              <Popup>
                <CityPopup zone={zone} deliveryZones={deliveryZones} colorMap={colorMap} />
              </Popup>
            </Marker>
          )
        })}

        {mapView === 'zones' && zoneGroups
          .filter(({ client }) => client.coordinates?.lat && client.coordinates?.lng)
          .map(({ client, zones }) => (
            <Marker
              key={`depot-${client.id}`}
              position={[client.coordinates.lat, client.coordinates.lng]}
              icon={makeDepotIcon(colorMap[client.id] ?? '#9CA3AF')}
            >
              <Popup>
                <div className="text-sm min-w-[160px]">
                  <p className="font-semibold text-gray-800">{client.name}</p>
                  <p className="text-gray-500 text-xs">{client.company}</p>
                  <p className="text-xs text-blue-600 mt-1 font-medium">
                    🚚 {zones.length} zona{zones.length > 1 ? 's' : ''} de reparto
                  </p>
                  <div className="mt-1 space-y-0.5">
                    {zones.map(z => (
                      <p key={z.id} className="text-xs text-gray-500">• {z.city}</p>
                    ))}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))
        }
      </MapContainer>

      {mapView === 'clients' && <Legend />}
      {mapView === 'zones' && <ZonesLegend clientsWithDelivery={clientsWithDelivery} colorMap={colorMap} />}
    </div>
  )
}
