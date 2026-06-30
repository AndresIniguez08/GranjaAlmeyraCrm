import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Modal, Button, Select, Textarea, Input } from '@/components/ui'
import { followupService } from '@/services/followupService'
import useAuthStore from '@/store/authStore'
import useFollowupStore from '@/store/followupStore'
import { ACTION_TYPES, ESTADOS_CONTACTO, NO_VIABLE_REASONS } from '@/utils/constants'
import { formatDate } from '@/utils/formatters'

const today = format(new Date(), 'yyyy-MM-dd')

const schema = z.object({
  result_note: z.string().min(1, 'Describí el resultado del seguimiento'),
  new_contact_status: z.string().optional(),
  no_viable_reason: z.string().optional(),
  reschedule: z.boolean().optional(),
  new_date: z.string().optional(),
  new_action_type: z.string().optional(),
  new_note: z.string().optional(),
}).refine(data => {
  if (data.reschedule) {
    return !!data.new_date && !!data.new_action_type
  }
  return true
}, { message: 'Completá la fecha y tipo del nuevo seguimiento', path: ['new_date'] })
.refine(data => {
  if (data.new_contact_status === 'No Viable') {
    return !!data.no_viable_reason
  }
  return true
}, { message: 'Seleccioná un motivo', path: ['no_viable_reason'] })

export function CompleteFollowupModal({ open, onClose, followup, onConvertToClient }) {
  const { userName } = useAuthStore()
  const resolveFollowup = useFollowupStore(s => s.resolveFollowup)
  const addFollowup = useFollowupStore(s => s.addFollowup)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      result_note: '',
      new_contact_status: 'no_cambiar',
      reschedule: false,
      new_date: today,
      new_action_type: '',
      new_note: '',
    },
  })

  const reschedule = watch('reschedule')
  const newContactStatus = watch('new_contact_status')

  async function onSubmit(data) {
    try {
      await followupService.completeFollowup(followup.id, {
        result_note: data.result_note,
        completed_by: userName,
        new_contact_status: data.new_contact_status !== 'no_cambiar' ? data.new_contact_status : null,
        no_viable_reason: data.new_contact_status === 'No Viable' ? data.no_viable_reason : null,
        contact_id: followup.contact_id,
      })

      resolveFollowup(followup.id)

      if (data.reschedule && data.new_date && data.new_action_type) {
        const newFollowup = await followupService.createFollowup({
          contact_id: followup.contact_id,
          scheduled_date: data.new_date,
          action_type: data.new_action_type,
          note: data.new_note || null,
          created_by: userName,
        })
        addFollowup({
          ...newFollowup,
          cliente: followup.cliente,
          empresa: followup.empresa,
          telefono: followup.telefono,
          vendedor: followup.vendedor,
        })
        toast.success('Seguimiento completado y nuevo seguimiento agendado ✓')
      } else {
        toast.success('Seguimiento completado ✓')
      }

      onClose()

      // Disparar conversión a cliente si el estado cambió a Vendido
      if (data.new_contact_status === 'Vendido' && onConvertToClient) {
        onConvertToClient({
          id: followup.contact_id,
          cliente: followup.cliente,
          empresa: followup.empresa,
          telefono: followup.telefono,
        })
      }
    } catch (err) {
      toast.error('Error: ' + err.message)
    }
  }

  if (!followup) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Completar Seguimiento"
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="complete-form" size="sm" loading={isSubmitting} variant="primary">
            Confirmar
          </Button>
        </>
      }
    >
      {/* Header info */}
      <div className="mb-5 px-3 py-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">{followup.cliente} · <span className="font-normal text-gray-500">{followup.empresa}</span></p>
          <span className="text-xs text-gray-400">{formatDate(followup.scheduled_date)}</span>
        </div>
        {followup.note && <p className="text-xs text-gray-500 italic">&ldquo;{followup.note}&rdquo;</p>}
      </div>

      <form id="complete-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Textarea
          label="Resultado del seguimiento"
          required
          placeholder="¿Qué resultado tuvo este seguimiento?"
          rows={3}
          error={errors.result_note?.message}
          {...register('result_note')}
        />

        <Select
          label="¿Actualizar estado del contacto?"
          options={[
            { value: 'no_cambiar', label: 'No cambiar' },
            ...ESTADOS_CONTACTO.map(e => ({ value: e, label: e })),
          ]}
          {...register('new_contact_status')}
        />

        {newContactStatus === 'No Viable' && (
          <div className="space-y-2 p-3 bg-red-50 rounded-lg border border-red-100">
            <label className="block text-sm font-medium text-gray-700">
              Motivo <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              {...register('no_viable_reason')}
            >
              <option value="">Seleccionar motivo...</option>
              {NO_VIABLE_REASONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {errors.no_viable_reason && (
              <p className="text-xs text-red-500">{errors.no_viable_reason.message}</p>
            )}
          </div>
        )}

        {/* Checkbox para reagendar */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300 accent-primary-500"
            {...register('reschedule')}
          />
          <span className="text-sm font-medium text-gray-700">Agendar nuevo seguimiento</span>
        </label>

        {reschedule && (
          <div className="space-y-3 pl-6 border-l-2 border-primary-200">
            <Input
              label="Nueva fecha"
              type="date"
              min={today}
              required
              error={errors.new_date?.message}
              {...register('new_date')}
            />
            <Select
              label="Tipo de acción"
              required
              placeholder="Seleccionar..."
              options={ACTION_TYPES.map(a => ({ value: a.value, label: a.label }))}
              {...register('new_action_type')}
            />
            <Textarea
              label="Nota para el próximo seguimiento"
              placeholder="Opcional..."
              rows={2}
              {...register('new_note')}
            />
          </div>
        )}
      </form>
    </Modal>
  )
}
