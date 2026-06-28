import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { Modal, Button } from '@/components/ui'
import { upsertGoal } from '@/services/goalsService'
import useAuthStore from '@/store/authStore'

const inputClass =
  'w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg outline-none transition-colors ' +
  'focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20'

export function GoalModal({ open, onClose, month, vendedores, goalsMap, onSaved }) {
  const { userName } = useAuthStore()
  const [values,  setValues]  = useState({})
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    if (!open) return
    const init = {}
    vendedores.forEach(v => {
      init[v] = {
        goal_contacts: goalsMap[v]?.goal_contacts ?? 0,
        goal_sales:    goalsMap[v]?.goal_sales    ?? 0,
      }
    })
    setValues(init)
  }, [open, vendedores, goalsMap])

  function setField(vendedor, field, raw) {
    const num = Math.max(0, parseInt(raw, 10) || 0)
    setValues(prev => ({
      ...prev,
      [vendedor]: { ...prev[vendedor], [field]: num },
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await Promise.all(
        vendedores.map(v =>
          upsertGoal({
            vendedor:      v,
            month,
            goal_contacts: values[v]?.goal_contacts ?? 0,
            goal_sales:    values[v]?.goal_sales    ?? 0,
            created_by:    userName,
          })
        )
      )
      const label = format(parseISO(month), 'MMMM yyyy', { locale: es })
      toast.success(`Objetivos guardados para ${label}`)
      onSaved()
      onClose()
    } catch (err) {
      toast.error('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const title = month
    ? `Objetivos — ${format(parseISO(month), 'MMMM yyyy', { locale: es })}`
    : 'Objetivos'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} loading={saving}>
            Guardar objetivos
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {vendedores.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">
            No hay vendedores registrados aún.
          </p>
        )}
        {vendedores.map(v => (
          <div key={v} className="p-4 border border-gray-200 rounded-xl bg-gray-50">
            <p className="text-sm font-semibold text-gray-800 mb-3">{v}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">
                  Contactos / mes
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={values[v]?.goal_contacts ?? 0}
                  onChange={e => setField(v, 'goal_contacts', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">
                  Ventas / mes
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={values[v]?.goal_sales ?? 0}
                  onChange={e => setField(v, 'goal_sales', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
