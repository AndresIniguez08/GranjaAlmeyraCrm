import { useNavigate } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { Modal, Badge, Button } from '@/components/ui'
import { cleanPhoneForWhatsApp } from '@/utils/formatters'

export function ContactMapDetailModal({ contact, open, onClose }) {
  const navigate = useNavigate()

  if (!contact) return null

  const phone = cleanPhoneForWhatsApp(contact.telefono)

  function handleViewHistory() {
    onClose()
    navigate('/contacts', { state: { focusContact: contact } })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Contacto"
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cerrar</Button>
          <Button size="sm" onClick={handleViewHistory}>Ver historial completo</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 text-base leading-tight truncate">
              {contact.cliente}
            </h3>
            {contact.empresa && (
              <p className="text-sm text-gray-500 truncate">{contact.empresa}</p>
            )}
          </div>
          {contact.estado && <Badge label={contact.estado} size="md" />}
        </div>

        {contact.telefono && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{contact.telefono}</span>
            {phone && (
              <a
                href={`https://api.whatsapp.com/send?phone=${phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:underline"
              >
                <MessageCircle size={12} /> WhatsApp
              </a>
            )}
          </div>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm pt-2 border-t border-gray-100">
          <div>
            <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Producto</dt>
            <dd className="text-gray-800">{contact.producto || '-'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Vendedor</dt>
            <dd className="text-gray-800">{contact.vendedor || '-'}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ubicación</dt>
            <dd className="text-gray-800">
              {contact.localidad}
              {contact.provincia && `, ${contact.provincia}`}
            </dd>
          </div>
        </dl>
      </div>
    </Modal>
  )
}
