import { MapPin, X, MessageCircle } from 'lucide-react'
import { cleanPhoneForWhatsApp } from '@/utils/formatters'

export function DeliveryZonePanel({ zone, onClose }) {
  return (
    <div className="absolute right-0 top-0 bottom-0 w-[320px] bg-white
                    shadow-xl z-[1000] flex flex-col border-l border-gray-100">

      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-amber-500" />
              <h3 className="font-semibold text-gray-800">{zone.city}</h3>
            </div>
            {zone.province && (
              <p className="text-xs text-gray-400 mt-0.5 ml-6">{zone.province}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {zone.clients.length} distribuidor{zone.clients.length !== 1 ? 'es' : ''}
          {zone.clients.length !== 1 ? ' cubren' : ' cubre'} esta zona
        </p>
      </div>

      {/* Lista de distribuidores */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {zone.clients.map(client => {
          const phone = cleanPhoneForWhatsApp(client.phone)
          return (
            <div
              key={client.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100
                         bg-gray-50 hover:bg-amber-50 hover:border-amber-200 transition-colors"
            >
              <div
                className="w-4 h-4 rounded-full flex-shrink-0 border-2 border-white shadow"
                style={{ backgroundColor: client.color }}
              />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {client.name}
                </p>
                {client.company && (
                  <p className="text-xs text-gray-400 truncate">{client.company}</p>
                )}
                <span className="text-xs text-gray-500">{client.type}</span>
              </div>

              {phone && (
                <a
                  href={`https://api.whatsapp.com/send?phone=${phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 flex-shrink-0"
                  title="WhatsApp"
                >
                  <MessageCircle size={15} />
                </a>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex-shrink-0">
        <p className="text-xs text-gray-400 text-center">
          Tap en otro punto del mapa para explorar más zonas
        </p>
      </div>
    </div>
  )
}
