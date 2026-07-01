import { useNavigate } from 'react-router-dom'
import { Map as MapIcon, MapPin } from 'lucide-react'
import { Modal, Badge, Button } from '@/components/ui'
import { formatDate, cleanPhoneForWhatsApp } from '@/utils/formatters'
import { DeliveryZoneManager } from './DeliveryZoneManager'

export function ClientViewModal({ client, open, onClose, onEdit }) {
  if (!client) return null
  const phone = cleanPhoneForWhatsApp(client.phone)
  const navigate = useNavigate()

  function handleViewOnMap() {
    navigate('/map', { state: { focusClient: client } })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Detalle del Cliente" size="md"
      footer={
        <>
          {client.coordinates ? (
            <button
              onClick={handleViewOnMap}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors mr-auto"
            >
              <MapIcon size={16} />
              Ver en mapa
            </button>
          ) : (
            <span className="text-xs text-gray-400 flex items-center gap-1 mr-auto">
              <MapPin size={12} />
              Sin ubicación registrada
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>Cerrar</Button>
          <Button size="sm" onClick={() => { onClose(); onEdit(client) }}>Editar</Button>
        </>
      }
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <Field label="Nombre" value={client.name} />
        <Field label="Empresa" value={client.company} />
        <Field label="Teléfono" value={
          <span className="flex items-center gap-2">
            {client.phone || '-'}
            {phone && (
              <a href={`https://api.whatsapp.com/send?phone=${phone}`} target="_blank" rel="noopener noreferrer"
                className="text-green-600 hover:underline text-xs font-semibold">
                WhatsApp ↗
              </a>
            )}
          </span>
        } />
        <Field label="Email" value={client.email} />
        <Field label="Tipo" value={client.type ? <Badge label={client.type} /> : '-'} />
        <Field label="Estado" value={client.status ? <Badge label={client.status} /> : '-'} />
        <div className="col-span-2">
          <Field label="Dirección" value={client.address} />
        </div>
        {client.coordinates && (
          <div className="col-span-2">
            <Field label="Coordenadas" value={`${client.coordinates.lat?.toFixed(5)}, ${client.coordinates.lng?.toFixed(5)}`} />
          </div>
        )}
        {client.notes && (
          <div className="col-span-2">
            <Field label="Notas" value={client.notes} />
          </div>
        )}
        <div className="col-span-2 pt-2 border-t border-gray-100 mt-1">
          <Field label="Registrado por" value={client.registered_by} />
          <Field label="Fecha registro" value={formatDate(client.registered_at)} />
        </div>
      </dl>

      <DeliveryZoneManager client={client} />
    </Modal>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-sm text-text-primary">{value ?? '-'}</dd>
    </div>
  )
}
