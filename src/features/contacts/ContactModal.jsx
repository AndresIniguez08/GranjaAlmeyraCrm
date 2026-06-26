import { useState } from 'react'
import { Modal, Badge, Button } from '@/components/ui'
import { formatDate, formatDateTime, cleanPhoneForWhatsApp } from '@/utils/formatters'
import { FollowupTimeline } from '@/features/followups/FollowupTimeline'
import { FollowupModal } from '@/features/followups/FollowupModal'

export function ContactViewModal({ contact, open, onClose, onEdit }) {
  const [schedulingFollowup, setSchedulingFollowup] = useState(false)
  const [timelineKey, setTimelineKey] = useState(0)

  if (!contact) return null

  const phone = cleanPhoneForWhatsApp(contact.telefono)

  function handleClose() {
    setSchedulingFollowup(false)
    onClose()
  }

  function handleFollowupModalClose() {
    setSchedulingFollowup(false)
    setTimelineKey(k => k + 1)
  }

  return (
    <>
      <Modal open={open} onClose={handleClose} title="Detalle del Contacto" size="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={handleClose}>Cerrar</Button>
            <Button size="sm" onClick={() => { handleClose(); onEdit(contact) }}>Editar</Button>
          </>
        }
      >
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="Fecha" value={formatDate(contact.fecha)} />
          <Field label="Vendedor" value={contact.vendedor} />
          <Field label="Cliente" value={contact.cliente} />
          <Field label="Empresa" value={contact.empresa} />
          <Field label="Teléfono" value={
            <span className="flex items-center gap-2">
              {contact.telefono || '-'}
              {phone && (
                <a href={`https://api.whatsapp.com/send?phone=${phone}`} target="_blank" rel="noopener noreferrer"
                  className="text-green-600 hover:underline text-xs font-semibold">
                  WhatsApp ↗
                </a>
              )}
            </span>
          } />
          <Field label="Email" value={contact.email || '-'} />
          <Field label="Producto" value={contact.producto} />
          <Field label="Estado" value={contact.estado ? <Badge label={contact.estado} /> : '-'} />
          {contact.cliente_derivado && (
            <Field label="Derivado a" value={contact.cliente_derivado} />
          )}
          {contact.motivo && (
            <div className="col-span-2">
              <Field label="Motivo" value={contact.motivo} />
            </div>
          )}
          {contact.note && (
            <div className="col-span-2">
              <Field label="Nota" value={contact.note} />
            </div>
          )}
          <div className="col-span-2 pt-2 border-t border-gray-100 mt-1">
            <Field label="Registrado por" value={contact.registrado_por || '-'} />
            <Field label="Fecha registro" value={formatDateTime(contact.fecha_registro)} />
            {contact.editado_por && <>
              <Field label="Editado por" value={contact.editado_por} />
              <Field label="Última edición" value={formatDateTime(contact.fecha_edicion)} />
            </>}
          </div>
        </dl>

        {/* Historial de seguimientos */}
        <div className="mt-5 pt-5 border-t border-gray-100">
          <FollowupTimeline
            key={timelineKey}
            contactId={contact.id}
            onSchedule={() => setSchedulingFollowup(true)}
          />
        </div>
      </Modal>

      <FollowupModal
        open={schedulingFollowup}
        onClose={handleFollowupModalClose}
        contact={contact}
      />
    </>
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
