import { useEffect, useState } from 'react'
import { Phone, MapPin, MessageCircle, Mail, Clock, CheckCircle, XCircle, Plus } from 'lucide-react'
import { followupService } from '@/services/followupService'
import { formatDate, formatDateTime } from '@/utils/formatters'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

const ACTION_ICONS = {
  llamada:  <Phone size={14} className="text-blue-500" />,
  visita:   <MapPin size={14} className="text-green-600" />,
  whatsapp: <MessageCircle size={14} className="text-emerald-600" />,
  email:    <Mail size={14} className="text-violet-600" />,
}

const STATUS_ICONS = {
  pendiente:  <Clock size={14} className="text-amber-500" />,
  completado: <CheckCircle size={14} className="text-green-500" />,
  cancelado:  <XCircle size={14} className="text-gray-400" />,
}

const STATUS_LINE_COLOR = {
  pendiente:  'border-amber-300',
  completado: 'border-green-400',
  cancelado:  'border-gray-300',
}

export function FollowupTimeline({ contactId, onSchedule }) {
  const [followups, setFollowups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!contactId) return
    setLoading(true)
    followupService.getFollowupsByContact(contactId)
      .then(setFollowups)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [contactId])

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

      {followups.length === 0 ? (
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
        <ol className="relative border-l border-gray-200 space-y-4 ml-2">
          {followups.map(f => (
            <li key={f.id} className="ml-4">
              {/* dot */}
              <span className={`absolute -left-[7px] w-3.5 h-3.5 rounded-full bg-white border-2 flex items-center justify-center ${STATUS_LINE_COLOR[f.status]}`} />

              <div className="flex items-start gap-2">
                {ACTION_ICONS[f.action_type] ?? <Clock size={14} className="text-gray-400" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-700">{formatDate(f.scheduled_date)}</span>
                    <span className="text-xs text-gray-400 capitalize">{f.action_type}</span>
                    <Badge label={f.status} />
                  </div>
                  {f.note && (
                    <p className="text-xs text-gray-500 mt-0.5 italic">"{f.note}"</p>
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
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
