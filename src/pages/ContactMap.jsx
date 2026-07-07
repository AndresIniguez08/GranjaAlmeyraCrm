import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import { getContactsForMap } from '@/services/contactMapService'
import { ContactMapDetailModal } from '@/features/contacts/ContactMapDetailModal'
import { ContactMapPanel } from '@/features/contacts/ContactMapPanel'
import { Select, Button } from '@/components/ui'
import { ESTADOS_CONTACTO, VENDEDORES, CONTACT_STATE_COLORS } from '@/utils/constants'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

const ARGENTINA_CENTER = [-34.6037, -58.3816]
const DEFAULT_ZOOM = 6

function predominantEstado(contacts) {
  const counts = {}
  contacts.forEach(c => { counts[c.estado] = (counts[c.estado] ?? 0) + 1 })
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
}

function createContactMarkerIcon(count, color) {
  if (count <= 1) {
    return L.divIcon({
      className: '',
      html: `<div style="
        width: 18px;
        height: 18px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    })
  }
  return L.divIcon({
    className: '',
    html: `<div style="
      min-width: 28px;
      height: 28px;
      padding: 0 6px;
      background: ${color};
      border: 3px solid white;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      font-size: 12px;
      font-weight: bold;
      color: white;
      font-family: Arial, sans-serif;
    ">${count}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function Legend({ offset }) {
  return (
    <div className={`absolute bottom-6 z-[1000] bg-white rounded-xl border border-gray-200 shadow-lg p-3 pointer-events-none transition-all duration-300 ${
      offset ? 'right-[372px]' : 'right-3'
    }`}>
      <p className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">Estado de contactos</p>
      {Object.entries(CONTACT_STATE_COLORS).map(([estado, color]) => (
        <div key={estado} className="flex items-center gap-2 mb-1 last:mb-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-xs text-gray-700">{estado}</span>
        </div>
      ))}
      <p className="text-[10px] text-gray-400 mt-2 max-w-[160px] leading-tight">
        El color del marcador indica el estado predominante en esa localidad
      </p>
    </div>
  )
}

export default function ContactMap() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ estado: '', vendedor: '', provincia: '' })
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [detailContact, setDetailContact] = useState(null)

  useEffect(() => {
    setLoading(true)
    getContactsForMap()
      .then(setGroups)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const provinciasConContactos = useMemo(() => {
    return [...new Set(groups.map(g => g.provincia).filter(Boolean))].sort()
  }, [groups])

  const filteredGroups = useMemo(() => {
    return groups
      .map(g => ({
        ...g,
        contacts: g.contacts.filter(c =>
          (!filters.estado || c.estado === filters.estado) &&
          (!filters.vendedor || c.vendedor === filters.vendedor)
        ),
      }))
      .filter(g => g.contacts.length > 0 && (!filters.provincia || g.provincia === filters.provincia))
  }, [groups, filters])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between gap-4 px-6 py-3 md:px-8 bg-white border-b border-gray-200 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Mapa de Contactos Comerciales</h1>
          <p className="text-xs text-gray-500 mt-0.5">Distribución geográfica de contactos por localidad</p>
        </div>

        <div className="flex items-end gap-2 flex-wrap">
          <Select
            label="Estado"
            placeholder="Todos"
            options={ESTADOS_CONTACTO}
            className="w-36"
            value={filters.estado}
            onChange={e => setFilters(f => ({ ...f, estado: e.target.value }))}
          />
          <Select
            label="Vendedor"
            placeholder="Todos"
            options={VENDEDORES}
            className="w-44"
            value={filters.vendedor}
            onChange={e => setFilters(f => ({ ...f, vendedor: e.target.value }))}
          />
          <Select
            label="Provincia"
            placeholder="Todos"
            options={provinciasConContactos}
            className="w-44"
            value={filters.provincia}
            onChange={e => setFilters(f => ({ ...f, provincia: e.target.value }))}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setFilters({ estado: '', vendedor: '', provincia: '' })}
          >
            Limpiar
          </Button>
        </div>
      </div>

      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        {loading ? (
          <div className="h-full w-full flex items-center justify-center bg-primary-50">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="flex h-full relative">
            <div className={`flex-1 transition-all duration-300 ${selectedLocation ? 'mr-[360px]' : ''}`}>
              <MapContainer center={ARGENTINA_CENTER} zoom={DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {filteredGroups.map(group => {
                  const key = `${group.localidad}-${group.provincia}`
                  const estado = predominantEstado(group.contacts)
                  const color = CONTACT_STATE_COLORS[estado] ?? '#6B7280'
                  const count = group.contacts.length
                  const { lat, lng } = group.coordinates ?? {}
                  if (!lat || !lng) return null

                  return (
                    <Marker
                      key={key}
                      position={[lat, lng]}
                      icon={createContactMarkerIcon(count, color)}
                      eventHandlers={{ click: () => setSelectedLocation(group) }}
                    />
                  )
                })}
              </MapContainer>
            </div>

            {selectedLocation && (
              <ContactMapPanel
                key={`${selectedLocation.localidad}-${selectedLocation.provincia}`}
                location={selectedLocation}
                onClose={() => setSelectedLocation(null)}
                onContactClick={setDetailContact}
              />
            )}
          </div>
        )}

        <Legend offset={!!selectedLocation} />
      </div>

      <ContactMapDetailModal
        contact={detailContact}
        open={!!detailContact}
        onClose={() => setDetailContact(null)}
      />
    </div>
  )
}
