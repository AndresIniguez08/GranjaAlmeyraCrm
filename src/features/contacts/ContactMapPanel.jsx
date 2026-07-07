import { useState } from 'react'
import { MapPin, X, Search, Users } from 'lucide-react'
import { ESTADOS_CONTACTO } from '@/utils/constants'

function estadoBadgeClass(estado) {
  return estado === 'Vendido' ? 'bg-green-100 text-green-700'
    : estado === 'No Vendido' ? 'bg-red-100 text-red-700'
    : estado === 'Derivado' ? 'bg-amber-100 text-amber-700'
    : 'bg-gray-100 text-gray-600'
}

export function ContactMapPanel({ location, onClose, onContactClick }) {
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('')

  const filteredContacts = location.contacts.filter(contact => {
    const matchSearch = !search ||
      contact.cliente?.toLowerCase().includes(search.toLowerCase()) ||
      contact.empresa?.toLowerCase().includes(search.toLowerCase())
    const matchEstado = !filterEstado || contact.estado === filterEstado
    return matchSearch && matchEstado
  })

  return (
    <div className="absolute right-0 top-0 bottom-0 w-[360px] bg-white
                    shadow-xl z-[1000] flex flex-col border-l border-gray-100">

      <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-amber-500 flex-shrink-0" />
              <h3 className="font-semibold text-gray-800 text-base leading-tight">
                {location.localidad}
              </h3>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 ml-6">
              {location.provincia}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs bg-amber-100 text-amber-700
                             px-2 py-0.5 rounded-full font-medium">
              {filteredContacts.length} contacto{filteredContacts.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600
                         hover:bg-gray-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="mt-3 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en esta localidad..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200
                       rounded-lg focus:ring-2 focus:ring-amber-400
                       focus:border-transparent"
          />
        </div>

        <div className="flex gap-1.5 mt-2 flex-wrap">
          {['Todos', ...ESTADOS_CONTACTO].map(estado => (
            <button
              key={estado}
              onClick={() => setFilterEstado(estado === 'Todos' ? '' : estado)}
              className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                (filterEstado === '' && estado === 'Todos') || filterEstado === estado
                  ? 'bg-amber-500 border-amber-500 text-white'
                  : 'border-gray-200 text-gray-600 hover:border-amber-300'
              }`}
            >
              {estado}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredContacts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <Users size={24} className="mb-2 opacity-50" />
            <p className="text-sm">Sin resultados</p>
          </div>
        )}

        {filteredContacts.map(contact => (
          <button
            key={contact.id}
            onClick={() => onContactClick(contact)}
            className="w-full px-4 py-3 text-left hover:bg-amber-50
                       transition-colors border-b border-gray-50
                       last:border-0 group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate
                              group-hover:text-amber-700 transition-colors">
                  {contact.cliente}
                </p>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {contact.empresa}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-gray-500">{contact.producto}</span>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{contact.vendedor}</span>
                </div>
              </div>

              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${estadoBadgeClass(contact.estado)}`}>
                {contact.estado}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0 bg-gray-50">
        <div className="flex justify-around text-center">
          {[
            { label: 'Vendidos', estado: 'Vendido', color: 'text-green-600' },
            { label: 'No Vendidos', estado: 'No Vendido', color: 'text-red-500' },
            { label: 'Derivados', estado: 'Derivado', color: 'text-amber-600' },
          ].map(({ label, estado, color }) => {
            const count = location.contacts.filter(c => c.estado === estado).length
            if (count === 0) return null
            return (
              <div key={estado}>
                <p className={`text-lg font-bold ${color}`}>{count}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
