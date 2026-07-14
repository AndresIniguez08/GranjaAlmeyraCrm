import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { clientService } from '@/services/clientService'
import { getAllDeliveryZones, getDeliveryColors } from '@/services/deliveryZoneService'
import { TIPO_COLORS } from '@/utils/constants'
import { cleanPhoneForWhatsApp } from '@/utils/formatters'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { DeliveryZonePanel } from '@/features/clients/DeliveryZonePanel'

const ARGENTINA_CENTER = [-34.6037, -58.3816]
const DEFAULT_ZOOM = 6
const FALLBACK_COLOR = '#6B7280'

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

function ZonesLegend({ clientsWithDelivery, colorMap, offset }) {
  return (
    <div className={`absolute bottom-6 z-[1000] bg-white rounded-xl shadow-lg p-3 min-w-[200px] transition-all duration-300 ${
      offset ? 'right-[336px]' : 'right-4'
    }`}>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
        Distribuidores
      </p>

      {clientsWithDelivery.map(client => (
        <div key={client.id} className="flex items-center gap-2 mb-2">
          <div
            className="w-3.5 h-3.5 rounded-full border-2 border-white shadow"
            style={{ backgroundColor: colorMap[client.id] ?? FALLBACK_COLOR }}
          />
          <span className="text-xs text-gray-700 font-medium">{client.name}</span>
        </div>
      ))}

      {clientsWithDelivery.length === 0 && (
        <p className="text-xs text-gray-400">Ningún cliente tiene zonas definidas aún</p>
      )}

      <div className="border-t border-gray-100 mt-2 pt-2 space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-gray-400 flex items-center justify-center">
            <span className="text-white text-[8px] font-bold">3</span>
          </div>
          <span className="text-xs text-gray-400">3+ distribuidores</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs">🏭</span>
          <span className="text-xs text-gray-400">Sede del distribuidor</span>
        </div>
      </div>
    </div>
  )
}

// ── Íconos Leaflet ────────────────────────────────────────────────────────────

function depotIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:22px;height:22px;
      background:${color};
      border:3px solid white;
      border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;
      font-size:11px;
    ">🏭</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

function singleIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:18px;height:18px;
      background:${color};
      border:3px solid white;
      border-radius:50%;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

function doubleIcon(color1, color2) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:20px;height:20px;
      background:linear-gradient(90deg, ${color1} 50%, ${color2} 50%);
      border:3px solid white;
      border-radius:50%;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

function multiIcon(count) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:24px;height:24px;
      background:#6B7280;
      border:3px solid white;
      border-radius:50%;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
      font-size:11px;font-weight:bold;color:white;
      font-family:Arial, sans-serif;
    ">${count}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

function getCityIcon(clients) {
  if (clients.length === 1) return singleIcon(clients[0].color)
  if (clients.length === 2) return doubleIcon(clients[0].color, clients[1].color)
  return multiIcon(clients.length)
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
  const [colorMap, setColorMap] = useState({})
  const [loadingZones, setLoadingZones] = useState(false)
  const [selectedZone, setSelectedZone] = useState(null)

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

  // ── Cargar zonas de reparto + colores fijos ────────────────────────────────
  useEffect(() => {
    if (mapView !== 'zones') return
    setLoadingZones(true)
    Promise.all([getAllDeliveryZones(), getDeliveryColors()])
      .then(([zones, colors]) => {
        setDeliveryZones(zones)
        setColorMap(colors)
      })
      .catch(() => {})
      .finally(() => setLoadingZones(false))
  }, [mapView])

  // ── Cerrar panel lateral al salir de la vista de zonas ─────────────────────
  useEffect(() => {
    if (mapView !== 'zones') setSelectedZone(null)
  }, [mapView])

  // ── Abrir popup cliente enfocado ───────────────────────────────────────────
  useEffect(() => {
    if (!focusClient || loading) return
    const timer = setTimeout(() => {
      focusedMarkerRef.current?.openPopup()
    }, 600)
    return () => clearTimeout(timer)
  }, [focusClient, loading])

  // ── Calcular grupos de zonas por cliente (sedes) ───────────────────────────
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

  // ── Agrupar zonas por ciudad para saber cuántos distribuidores la cubren ───
  const cityGroups = (() => {
    const zonesByCity = {}
    deliveryZones.forEach(zone => {
      const key = zone.city.toLowerCase()
      if (!zonesByCity[key]) {
        zonesByCity[key] = {
          city: zone.city,
          province: zone.province,
          coordinates: zone.coordinates,
          clients: [],
        }
      }
      zonesByCity[key].clients.push({
        ...zone.commercial_clients,
        color: colorMap[zone.client_id] ?? FALLBACK_COLOR,
      })
    })
    return Object.values(zonesByCity)
  })()

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

      <div className="flex h-full relative">
        <div className={`flex-1 transition-all duration-300 ${selectedZone ? 'mr-[320px]' : ''}`}>
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
            {mapView === 'zones' && cityGroups.map(group => (
              <Marker
                key={group.city}
                position={[group.coordinates.lat, group.coordinates.lng]}
                icon={getCityIcon(group.clients)}
                eventHandlers={{ click: () => setSelectedZone(group) }}
              />
            ))}

            {mapView === 'zones' && zoneGroups
              .filter(({ client }) => client.coordinates?.lat && client.coordinates?.lng)
              .map(({ client, zones }) => (
                <Marker
                  key={`depot-${client.id}`}
                  position={[client.coordinates.lat, client.coordinates.lng]}
                  icon={depotIcon(colorMap[client.id] ?? FALLBACK_COLOR)}
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
                          <p key={z.id} className="text-xs text-gray-500">
                            • {z.city}{z.province ? `, ${z.province}` : ''}
                          </p>
                        ))}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))
            }
          </MapContainer>
        </div>

        {mapView === 'zones' && selectedZone && (
          <DeliveryZonePanel
            key={selectedZone.city}
            zone={selectedZone}
            onClose={() => setSelectedZone(null)}
          />
        )}
      </div>

      {mapView === 'clients' && <Legend />}
      {mapView === 'zones' && (
        <ZonesLegend
          clientsWithDelivery={clientsWithDelivery}
          colorMap={colorMap}
          offset={!!selectedZone}
        />
      )}
    </div>
  )
}
