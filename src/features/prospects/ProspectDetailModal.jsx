import { Phone, MessageCircle, AtSign, FileText, MapPin, Edit3, Mail, Clock } from 'lucide-react'
import { Modal, Button } from '@/components/ui'
import { PROSPECT_ACTIONS, PROSPECT_RESULTS } from '@/utils/constants'
import { formatDate } from '@/utils/formatters'

const ACTION_ICONS = {
  ig:            AtSign,
  whatsapp:      MessageCircle,
  lista_precios: FileText,
  llamada:       Phone,
  visita:        MapPin,
  otro:          Edit3,
  email:         Mail,
}

export function ProspectDetailModal({ open, onClose, prospect }) {
  if (!prospect) return null

  const attempts = [...(prospect.attempts ?? [])].reverse()
  const lastAttempt = attempts[0]
  const firstAttempt = attempts[attempts.length - 1]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ficha del Prospecto"
      size="lg"
      footer={<Button variant="ghost" size="sm" onClick={onClose}>Cerrar</Button>}
    >
      {/* ── Resumen rápido ────────────────────────────────────────────────── */}
      <div className="mb-5 p-4 bg-amber-50 rounded-xl border border-amber-100">
        <h3 className="font-bold text-gray-900 text-base leading-tight">
          {prospect.name}
          {prospect.business && (
            <span className="font-normal text-gray-500"> — {prospect.business}</span>
          )}
        </h3>

        <div className="flex items-center gap-4 mt-1.5 flex-wrap">
          {prospect.phone && (
            <div className="flex items-center gap-1.5">
              <Phone size={12} className="text-gray-400 shrink-0" />
              <span className="text-sm text-gray-600">{prospect.phone}</span>
              <a
                href={`https://api.whatsapp.com/send?phone=54${prospect.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:underline text-xs font-semibold"
              >
                WhatsApp ↗
              </a>
            </div>
          )}
          {prospect.instagram && (
            <div className="flex items-center gap-1">
              <AtSign size={12} className="text-pink-400 shrink-0" />
              <a
                href={`https://instagram.com/${prospect.instagram.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-pink-500 hover:underline"
              >
                {prospect.instagram.replace(/^@/, '')}
              </a>
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-amber-200 grid grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Intentos</p>
            <p className="text-sm font-bold text-gray-800 mt-0.5">{attempts.length}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Primer contacto</p>
            <p className="text-sm font-medium text-gray-700 mt-0.5">
              {firstAttempt ? formatDate(firstAttempt.attempt_date) : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Última actividad</p>
            <p className="text-sm font-medium text-gray-700 mt-0.5">
              {lastAttempt ? formatDate(lastAttempt.attempt_date) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Timeline de intentos ──────────────────────────────────────────── */}
      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
        Historial de Intentos
      </h4>

      {attempts.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Clock size={28} className="mx-auto mb-2 opacity-40" />
          <p className="text-xs">Sin intentos registrados</p>
        </div>
      ) : (
        <ol className="relative border-l-2 border-gray-100 space-y-5 ml-2">
          {attempts.map((a) => {
            const actionInfo = PROSPECT_ACTIONS.find(x => x.value === a.action)
            const resultInfo = PROSPECT_RESULTS[a.result]
            const Icon = ACTION_ICONS[a.action] ?? Edit3

            return (
              <li key={a.id} className="ml-4 relative">
                <span
                  className="absolute -left-[17px] w-3 h-3 rounded-full bg-white border-2"
                  style={{ borderColor: actionInfo?.color ?? '#E5E7EB' }}
                />
                <div className="flex items-start gap-2">
                  <Icon
                    size={14}
                    style={{ color: actionInfo?.color ?? '#6B7280' }}
                    className="mt-0.5 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-gray-700">
                        {formatDate(a.attempt_date)}
                      </span>
                      {actionInfo && (
                        <span
                          className="text-xs font-medium"
                          style={{ color: actionInfo.color }}
                        >
                          {actionInfo.label}
                        </span>
                      )}
                      {resultInfo && (
                        <span
                          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: resultInfo.bg, color: resultInfo.text }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: resultInfo.color }}
                          />
                          {resultInfo.label}
                        </span>
                      )}
                    </div>

                    {a.action_note && (
                      <p className="text-xs text-gray-500 mt-0.5 italic">
                        &ldquo;{a.action_note}&rdquo;
                      </p>
                    )}

                    {a.created_by && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Por {a.created_by}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </Modal>
  )
}
