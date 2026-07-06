import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { MessageCircle } from 'lucide-react'
import { getContactsForMap } from '@/services/contactMapService'
import { ContactMapDetailModal } from '@/features/contacts/ContactMapDetailModal'
import { Select, Button } from '@/components/ui'
import { ESTADOS_CONTACTO, VENDEDORES, CONTACT_STATE_COLORS } from '@/utils/constants'
import { cleanPhoneForWhatsApp } from '@/utils/formatters'
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

function estadoBadgeClass(estado) {
  return estado === 'Vendido' ? 'bg-green-100 text-green-700'
    : estado === 'No Vendido' ? 'bg-red-100 text-red-700'
    : estado === 'Derivado' ? 'bg-amber-100 text-amber-700'
    : 'bg-gray-100 text-gray-600'
}

function Legend() {
  return (
    <div className="absolute bottom-6 right-3 z-[1000] bg-white rounded-xl border border-gray-200 shadow-lg p-3 pointer-events-none">
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
  const [selectedContact, setSelectedContact] = useState(null)
  const markerRefs = useRef({})

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

  function handleOpenContact(key, contact) {
    markerRefs.current[key]?.closePopup()
    setSelectedContact(contact)
  }

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
                  ref={(ref) => { markerRefs.current[key] = ref }}
                  position={[lat, lng]}
                  icon={createContactMarkerIcon(count, color)}
                >
                  <Popup maxWidth={count > 1 ? 280 : 240}>
                    {count === 1 ? (
                      <SingleContactPopup contact={group.contacts[0]} localidad={group.localidad} provincia={group.provincia} />
                    ) : (
                      <MultiContactPopup
                        group={group}
                        onSelect={(contact) => handleOpenContact(key, contact)}
                      />
                    )}
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        )}

        <Legend />
      </div>

      <ContactMapDetailModal
        contact={selectedContact}
        open={!!selectedContact}
        onClose={() => setSelectedContact(null)}
      />
    </div>
  )
}

function SingleContactPopup({ contact, localidad, provincia }) {
  const phone = cleanPhoneForWhatsApp(contact.telefono)
  return (
    <div className="text-sm min-w-[200px]">
      <p className="font-semibold text-gray-800">{contact.cliente}</p>
      {contact.empresa && <p className="text-gray-500 text-xs">{contact.empresa}</p>}
      <p className="text-xs text-gray-400 mt-1">{localidad}, {provincia}</p>
      <div className="flex items-center gap-2 mt-2">
        <span className={`text-xs px-1.5 py-0.5 rounded ${estadoBadgeClass(contact.estado)}`}>
          {contact.estado}
        </span>
        <span className="text-xs text-gray-500">{contact.producto}</span>
      </div>
      {phone && (
        <a
          href={`https://api.whatsapp.com/send?phone=${phone}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-green-600 mt-2"
        >
          <MessageCircle size={12} /> WhatsApp
        </a>
      )}
    </div>
  )
}

function MultiContactPopup({ group, onSelect }) {
  return (
    <div className="text-sm min-w-[240px]">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
        <p className="font-semibold text-gray-800">
          📍 {group.localidad}, {group.provincia}
        </p>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
          {group.contacts.length} contactos
        </span>
      </div>

      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
        {group.contacts.map(contact => (
          <button
            key={contact.id}
            onClick={() => onSelect(contact)}
            className="w-full text-left flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{contact.cliente}</p>
              <p className="text-xs text-gray-400 truncate">{contact.empresa}</p>
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ml-2 ${estadoBadgeClass(contact.estado)}`}>
              {contact.estado}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
