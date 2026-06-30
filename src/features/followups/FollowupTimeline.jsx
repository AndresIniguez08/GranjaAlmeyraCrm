import { useEffect, useState } from 'react'
import { Phone, MapPin, MessageCircle, Mail, AtSign, FileText, Edit3, Clock, Plus, ClipboardList } from 'lucide-react'
import { followupService } from '@/services/followupService'
import { formatDate, formatDateTime, getActionType } from '@/utils/formatters'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

const ACTION_ICON_COMPONENTS = {
  Phone, MapPin, MessageCircle, Mail, AtSign, FileText, Edit3,
}

const STATUS_LINE_COLOR = {
  pendiente:  'border-amber-300',
  completado: 'border-green-400',
  cancelado:  'border-gray-300',
}

export function FollowupTimeline({ contactId, onSchedule, contact, onLoad }) {
  const [followups, setFollowups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!contactId) return
    setLoading(true)
    followupService.getFollowupsByContact(contactId)
      .then(data => {
        setFollowups(data)
        onLoad?.({
          count: data.length,
          firstDate: data.length > 0 ? data[data.length - 1].scheduled_date : null,
          lastDate:  data.length > 0 ? data[0].scheduled_date : null,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [contactId]) // eslint-disable-line

  if (loading) return <div className="py-4 flex justify-center"><LoadingSpinner size="sm" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Historial de Seguimientos</h4>
        {onSchedule && (
          <Button size="sm" variant="ghost" onClick={onSchedule} className="text-xs gap-1">
            <Plus size={13} /> Agendar
          </Button>
        )}
      </div>

      {followups.length === 0 && !contact ? (
        <div className="text-center py-6 text-gray-400">
          <Clock size={28} className="mx-auto mb-2 opacity-40" />
          <p className="text-xs">Sin seguimientos registrados</p>
          {onSchedule && (
            <Button size="sm" variant="secondary" onClick={onSchedule} className="mt-3 text-xs">
              Agendar primero
            </Button>
          )}
        </div>
      ) : (
        <ol className="relative border-l-2 border-gray-100 space-y-5 ml-2">
          {followups.map(f => (
            <li key={f.id} className="ml-4 relative">
              <span className={`absolute -left-[17px] w-3 h-3 rounded-full bg-white border-2 ${STATUS_LINE_COLOR[f.status]}`} />

              {(() => {
                const action = getActionType(f.action_type)
                const Icon = ACTION_ICON_COMPONENTS[action.icon] ?? Clock
                return (
                  <div className="flex items-start gap-2">
                    <Icon size={14} style={{ color: action.color }} className="mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-gray-700">{formatDate(f.scheduled_date)}</span>
                        <span className="text-xs font-medium" style={{ color: action.color }}>{action.label}</span>
                        <Badge label={f.status} size="sm" />
                      </div>
                      {f.note && (
                        <p className="text-xs text-gray-500 mt-0.5 italic">&ldquo;{f.note}&rdquo;</p>
                      )}
                      {f.result_note && (
                        <p className="text-xs text-gray-700 mt-1">
                          <span className="font-semibold">Resultado:</span> {f.result_note}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Por {f.created_by}
                        {f.completed_by && ` · Completado por ${f.completed_by}`}
                        {f.completed_at && ` el ${formatDateTime(f.completed_at)}`}
                      </p>
                    </div>
                  </div>
                )
              })()}
            </li>
          ))}

          {/* Registro inicial del contacto */}
          {contact && (
            <li className="ml-4 relative">
              <span className="absolute -left-[17px] w-3 h-3 rounded-full bg-white border-2 border-gray-200" />
              <div className="flex items-start gap-2">
                <ClipboardList size={14} className="text-gray-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-700">{formatDate(contact.fecha)}</span>
                    <span className="text-xs text-gray-400 font-medium">Registro inicial</span>
                  </div>
                  {contact.producto && (
                    <p className="text-xs text-gray-500 mt-0.5">Producto solicitado: {contact.producto}</p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Estado inicial: {contact.estado || '—'}
                    {contact.registrado_por ? ` · Por ${contact.registrado_por}` : ''}
                  </p>
                </div>
              </div>
            </li>
          )}
        </ol>
      )}

      {followups.length === 0 && contact && onSchedule && (
        <div className="mt-4 text-center">
          <Button size="sm" variant="secondary" onClick={onSchedule} className="text-xs">
            Agendar primer seguimiento
          </Button>
        </div>
      )}
    </div>
  )
}
