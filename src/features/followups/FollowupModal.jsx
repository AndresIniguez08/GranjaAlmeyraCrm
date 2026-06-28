import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { AtSign, MessageCircle, FileText, Phone, MapPin, Edit3 } from 'lucide-react'
import { Modal, Button, Input, Textarea } from '@/components/ui'
import { followupService } from '@/services/followupService'
import useAuthStore from '@/store/authStore'
import useFollowupStore from '@/store/followupStore'
import { PROSPECT_ACTIONS, PROSPECT_RESULTS } from '@/utils/constants'

const ACTION_ICONS = {
  ig:            AtSign,
  whatsapp:      MessageCircle,
  lista_precios: FileText,
  llamada:       Phone,
  visita:        MapPin,
  otro:          Edit3,
}

const today = format(new Date(), 'yyyy-MM-dd')

const schema = z.object({
  scheduled_date: z.string().min(1, 'La fecha es requerida'),
  note: z.string().optional(),
})

export function FollowupModal({ open, onClose, contact }) {
  const { userName } = useAuthStore()
  const addFollowup = useFollowupStore(s => s.addFollowup)
  const [selectedAction, setSelectedAction] = useState('')
  const [actionError,    setActionError]    = useState(false)
  const [selectedResult, setSelectedResult] = useState('')
  const [resultError,    setResultError]    = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { scheduled_date: today, note: '' },
  })

  async function onSubmit(data) {
    const hasActionError  = !selectedAction
    const hasResultError  = !selectedResult
    setActionError(hasActionError)
    setResultError(hasResultError)
    if (hasActionError || hasResultError) return

    try {
      const saved = await followupService.createFollowup({
        contact_id:     contact.id,
        scheduled_date: data.scheduled_date,
        action_type:    selectedAction,
        result:         selectedResult,
        note:           data.note || null,
        created_by:     userName,
      })
      addFollowup({
        ...saved,
        cliente:  contact.cliente,
        empresa:  contact.empresa,
        telefono: contact.telefono,
        vendedor: contact.vendedor,
      })
      toast.success(`Seguimiento agendado para el ${format(new Date(data.scheduled_date + 'T12:00:00'), 'dd/MM/yyyy')}`)
      reset()
      setSelectedAction('')
      setSelectedResult('')
      setActionError(false)
      setResultError(false)
      onClose()
    } catch (err) {
      toast.error('Error al agendar: ' + err.message)
    }
  }

  function handleClose() {
    reset()
    setSelectedAction('')
    setSelectedResult('')
    setActionError(false)
    setResultError(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Agendar Seguimiento"
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={handleClose}>Cancelar</Button>
          <Button type="submit" form="followup-form" size="sm" loading={isSubmitting}>
            Agendar
          </Button>
        </>
      }
    >
      {contact && (
        <div className="mb-4 px-3 py-2 bg-primary-50 rounded-lg border border-primary-200">
          <p className="text-sm font-semibold text-gray-800">{contact.cliente}</p>
          <p className="text-xs text-gray-500">{contact.empresa}</p>
        </div>
      )}

      <form id="followup-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input
          label="Fecha del seguimiento"
          type="date"
          required
          min={today}
          error={errors.scheduled_date?.message}
          {...register('scheduled_date')}
        />

        {/* Tipo de acción — grid visual idéntico al AttemptModal */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-text-primary">
            Tipo de acción <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PROSPECT_ACTIONS.map((a) => {
              const Icon = ACTION_ICONS[a.value]
              const selected = selectedAction === a.value
              return (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => { setSelectedAction(a.value); setActionError(false) }}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all text-xs font-medium cursor-pointer"
                  style={{
                    borderColor:     selected ? a.color : '#E5E7EB',
                    backgroundColor: selected ? `${a.color}1A` : '#F9FAFB',
                    color:           selected ? a.color : '#6B7280',
                  }}
                >
                  {Icon && <Icon size={20} color={selected ? a.color : '#9CA3AF'} />}
                  {a.label}
                </button>
              )
            })}
          </div>
          {actionError && (
            <p className="text-xs text-red-600 font-medium">Seleccioná un tipo de acción</p>
          )}
        </div>

        {/* Resultado — grid 2×2 idéntico al AttemptModal */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-text-primary">
            Resultado <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(PROSPECT_RESULTS).map(([key, val]) => {
              const selected = selectedResult === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setSelectedResult(key); setResultError(false) }}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all cursor-pointer"
                  style={{
                    borderColor:     selected ? val.color : '#E5E7EB',
                    backgroundColor: selected ? val.bg    : '#F9FAFB',
                    color:           selected ? val.text  : '#6B7280',
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
          {resultError && (
            <p className="text-xs text-red-600 font-medium">Seleccioná un resultado</p>
          )}
        </div>

        <Textarea
          label="Nota previa"
          placeholder="¿Qué se va a tratar en este contacto?"
          rows={3}
          {...register('note')}
        />
      </form>
    </Modal>
  )
}
