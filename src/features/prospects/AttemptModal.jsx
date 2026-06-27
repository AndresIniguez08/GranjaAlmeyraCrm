import { useState, useEffect } from 'react'
import {
  AtSign, MessageCircle, FileText, Phone, MapPin, Edit3,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { PROSPECT_ACTIONS, PROSPECT_RESULTS } from '@/utils/constants'
import useAuthStore from '@/store/authStore'

const ACTION_ICONS = {
  ig:            AtSign,
  whatsapp:      MessageCircle,
  lista_precios: FileText,
  llamada:       Phone,
  visita:        MapPin,
  otro:          Edit3,
}

const TODAY = () => new Date().toISOString().slice(0, 10)

export function AttemptModal({ open, onClose, prospect, onSave, loading }) {
  const { userName } = useAuthStore()
  const [date, setDate]     = useState(TODAY())
  const [action, setAction] = useState(null)
  const [result, setResult] = useState(null)
  const [note, setNote]     = useState('')
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) {
      setDate(TODAY())
      setAction(null)
      setResult(null)
      setNote('')
      setErrors({})
    }
  }, [open, prospect?.id])

  function validate() {
    const errs = {}
    if (!date)                                errs.date   = 'La fecha es requerida'
    if (!action)                              errs.action = 'Seleccioná una acción'
    if (!result)                              errs.result = 'Seleccioná un resultado'
    if (action === 'otro' && !note.trim())    errs.note   = '¿Qué hiciste? es requerido'
    return errs
  }

  async function handleSave() {
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    await onSave({
      prospect_id: prospect.id,
      attempt_date: date,
      action,
      result,
      action_note: note.trim() || null,
      created_by: userName,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Registrar intento — ${prospect?.name ?? ''}`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSave} loading={loading}>Guardar intento</Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Fecha */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-text-primary">
            Fecha <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`w-full px-3 py-2 text-sm border-2 rounded-lg transition-colors outline-none
              ${errors.date
                ? 'border-red-400 focus:border-red-500'
                : 'border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
              }`}
          />
          {errors.date && <p className="text-xs text-red-600 font-medium">{errors.date}</p>}
        </div>

        {/* Acción — grid visual de 3×2 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-text-primary">
            Acción realizada <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PROSPECT_ACTIONS.map((a) => {
              const Icon = ACTION_ICONS[a.value]
              const selected = action === a.value
              return (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setAction(a.value)}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all text-xs font-medium cursor-pointer"
                  style={{
                    borderColor: selected ? a.color : '#E5E7EB',
                    backgroundColor: selected ? `${a.color}1A` : '#F9FAFB',
                    color: selected ? a.color : '#6B7280',
                  }}
                >
                  {Icon && <Icon size={20} color={selected ? a.color : '#9CA3AF'} />}
                  {a.label}
                </button>
              )
            })}
          </div>
          {errors.action && <p className="text-xs text-red-600 font-medium">{errors.action}</p>}
        </div>

        {/* Resultado — 4 botones en 2×2 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-text-primary">
            Resultado <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(PROSPECT_RESULTS).map(([key, val]) => {
              const selected = result === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setResult(key)}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all cursor-pointer"
                  style={{
                    borderColor: selected ? val.color : '#E5E7EB',
                    backgroundColor: selected ? val.bg : '#F9FAFB',
                    color: selected ? val.text : '#6B7280',
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: val.color }}
                  />
                  {val.label}
                </button>
              )
            })}
          </div>
          {errors.result && <p className="text-xs text-red-600 font-medium">{errors.result}</p>}
        </div>

        {/* Nota */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-text-primary">
            {action === 'otro' ? (
              <>¿Qué hiciste? <span className="text-red-500">*</span></>
            ) : (
              'Nota adicional (opcional)'
            )}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={action === 'otro' ? 'Describí qué acción realizaste...' : 'Notas adicionales...'}
            className={`w-full px-3 py-2 text-sm border-2 rounded-lg transition-colors outline-none resize-none
              placeholder:text-text-muted
              ${errors.note
                ? 'border-red-400 focus:border-red-500'
                : 'border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20'
              }`}
          />
          {errors.note && <p className="text-xs text-red-600 font-medium">{errors.note}</p>}
        </div>
      </div>
    </Modal>
  )
}
