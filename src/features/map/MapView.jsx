import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import { clientService } from '@/services/clientService'
import { TIPO_COLORS } from '@/utils/constants'
import { cleanPhoneForWhatsApp } from '@/utils/formatters'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

const ARGENTINA_CENTER = [-34.6037, -58.3816]
const DEFAULT_ZOOM = 6

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

// ── Leyenda ───────────────────────────────────────────────────────────────────

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

// ── MapView ───────────────────────────────────────────────────────────────────

export function MapView({ filters, focusClient }) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [geocodingCount, setGeocodingCount] = useState(0)
  const abortRef = useRef(false)
  const focusedMarkerRef = useRef(null)

  useEffect(() => {
    abortRef.current = false
    setLoading(true)

    clientService.getAllForMap().then(async (all) => {
      let filtered = all
      if (filters?.type)   filtered = filtered.filter(c => c.type === filters.type)
      if (filters?.status) filtered = filtered.filter(c => c.status === filters.status)

      const withCoords    = filtered.filter(c => c.coordinates?.lat && c.coordinates?.lng)
      const withoutCoords = filtered.filter(c => !(c.coordinates?.lat && c.coordinates?.lng) && c.address)

      // Si hay un focusClient con coords que no esté en el set filtrado, agregarlo
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
  }, [filters]) // eslint-disable-line

  // Abrir popup del cliente enfocado cuando carga termina
  useEffect(() => {
    if (!focusClient || loading) return
    const timer = setTimeout(() => {
      focusedMarkerRef.current?.openPopup()
    }, 600)
    return () => clearTimeout(timer)
  }, [focusClient, loading])

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-primary-50">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    // h-full + w-full hereda el tamaño del contenedor flex-1 de Map.jsx
    <div className="h-full w-full relative">

      {geocodingCount > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs text-amber-800 shadow-sm">
          Geocodificando {geocodingCount} dirección(es)…
        </div>
      )}

      {/* height: 100% llena exactamente el div padre — sin minHeight estático */}
      <MapContainer
        center={ARGENTINA_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

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
      </MapContainer>

      <Legend />
    </div>
  )
}
