import { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { PROSPECT_RESULTS } from '@/utils/constants'
import * as prospectService from '@/services/prospectService'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function parseLocalDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function CompleteAttemptModal({ attempt, onClose, onSuccess }) {
  const [result, setResult] = useState('')
  const [note, setNote] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (attempt) {
      setResult(attempt.result || '')
      setNote(attempt.action_note || '')
      setConfirmDelete(false)
    }
  }, [attempt])

  async function handleSave() {
    if (!result) {
      toast.error('Seleccioná un resultado')
      return
    }
    setSaving(true)
    try {
      await prospectService.updateAttempt(attempt.id, {
        action: attempt.action,
        action_note: note.trim() || null,
        result,
      })
      toast.success('Intento actualizado')
      onSuccess()
    } catch (err) {
      toast.error(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setSaving(true)
    try {
      await prospectService.deleteAttempt(attempt.id)
      toast.success('Intento eliminado')
      onSuccess()
    } catch (err) {
      toast.error(err.message || 'Error al eliminar')
    } finally {
      setSaving(false)
    }
  }

  if (!attempt) return null

  const attemptDate = parseLocalDate(attempt.attempt_date)
  const formattedDate = attemptDate
    ? format(attemptDate, "d 'de' MMMM yyyy", { locale: es })
    : '—'

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Editar intento"
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            loading={saving}
          >
            <Trash2 size={14} />
            {confirmDelete ? '¿Confirmar?' : 'Eliminar intento'}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} loading={saving}>Guardar</Button>
          </div>
        </div>
      }
    >
      {/* Header con info del prospecto */}
      <div className="mb-5 px-3 py-3 bg-gray-50 rounded-lg border border-gray-200 space-y-0.5">
        <p className="text-sm font-semibold text-gray-800">
          {attempt.prospectName}
          {attempt.prospectBusiness && (
            <span className="font-normal text-gray-500"> · {attempt.prospectBusiness}</span>
          )}
        </p>
        <p className="text-xs text-gray-400">{formattedDate}</p>
      </div>

      <div className="space-y-4">
        {/* Resultado */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">Resultado</label>
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
        </div>

        {/* Nota */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-gray-700">Nota del resultado</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="¿Qué pasó en este contacto?"
            className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg transition-colors outline-none resize-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-gray-400"
          />
        </div>
      </div>
    </Modal>
  )
}
