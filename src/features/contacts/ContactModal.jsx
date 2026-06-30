import { useState } from 'react'
import { Phone } from 'lucide-react'
import { Modal, Badge, Button } from '@/components/ui'
import { formatDate, formatDateTime, cleanPhoneForWhatsApp } from '@/utils/formatters'
import { FollowupTimeline } from '@/features/followups/FollowupTimeline'
import { FollowupModal } from '@/features/followups/FollowupModal'

export function ContactViewModal({ contact, open, onClose, onEdit }) {
  const [schedulingFollowup, setSchedulingFollowup] = useState(false)
  const [timelineKey, setTimelineKey] = useState(0)
  const [followupStats, setFollowupStats] = useState(null)

  if (!contact) return null

  const phone = cleanPhoneForWhatsApp(contact.telefono)

  function handleClose() {
    setSchedulingFollowup(false)
    setFollowupStats(null)
    onClose()
  }

  function handleFollowupModalClose() {
    setSchedulingFollowup(false)
    setTimelineKey(k => k + 1)
  }

  return (
    <>
      <Modal open={open} onClose={handleClose} title="Ficha del Contacto" size="lg"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={handleClose}>Cerrar</Button>
            <Button size="sm" onClick={() => { handleClose(); onEdit(contact) }}>Editar</Button>
          </>
        }
      >
        {/* ── Resumen rápido ─────────────────────────────────────────────────── */}
        <div className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 text-base leading-tight">
                {contact.cliente}
                {contact.empresa && (
                  <span className="font-normal text-gray-500"> — {contact.empresa}</span>
                )}
              </h3>
              {contact.telefono && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Phone size={12} className="text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-600">{contact.telefono}</span>
                  {phone && (
                    <a
                      href={`https://api.whatsapp.com/send?phone=${phone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:underline text-xs font-semibold ml-1"
                    >
                      WhatsApp ↗
                    </a>
                  )}
                </div>
              )}
            </div>
            {contact.estado && <Badge label={contact.estado} size="md" />}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Interacciones</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">
                {followupStats !== null ? followupStats.count : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Primera vez</p>
              <p className="text-sm font-medium text-gray-700 mt-0.5">{formatDate(contact.fecha)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Última actividad</p>
              <p className="text-sm font-medium text-gray-700 mt-0.5">
                {followupStats?.lastDate ? formatDate(followupStats.lastDate) : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Datos adicionales ──────────────────────────────────────────────── */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mb-5">
          <Field label="Vendedor" value={contact.vendedor} />
          <Field label="Producto" value={contact.producto} />
          {contact.email && <Field label="Email" value={contact.email} />}
          {contact.cliente_derivado && <Field label="Derivado a" value={contact.cliente_derivado} />}
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
            {contact.editado_por && (
              <>
                <Field label="Editado por" value={contact.editado_por} />
                <Field label="Última edición" value={formatDateTime(contact.fecha_edicion)} />
              </>
            )}
          </div>
        </dl>

        {/* ── Timeline de seguimientos ───────────────────────────────────────── */}
        <div className="pt-4 border-t border-gray-100">
          <FollowupTimeline
            key={timelineKey}
            contactId={contact.id}
            contact={contact}
            onLoad={setFollowupStats}
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
