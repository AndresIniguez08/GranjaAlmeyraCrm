import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Modal, Button, Input, Select, Textarea } from '@/components/ui'
import { followupService } from '@/services/followupService'
import useAuthStore from '@/store/authStore'
import useFollowupStore from '@/store/followupStore'
import { ACTION_TYPES } from '@/utils/constants'

const today = format(new Date(), 'yyyy-MM-dd')

const schema = z.object({
  scheduled_date: z.string().min(1, 'La fecha es requerida'),
  action_type: z.string().min(1, 'El tipo es requerido'),
  note: z.string().optional(),
})

export function FollowupModal({ open, onClose, contact }) {
  const { userName } = useAuthStore()
  const addFollowup = useFollowupStore(s => s.addFollowup)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { scheduled_date: today, action_type: '', note: '' },
  })

  async function onSubmit(data) {
    try {
      const saved = await followupService.createFollowup({
        contact_id: contact.id,
        scheduled_date: data.scheduled_date,
        action_type: data.action_type,
        note: data.note || null,
        created_by: userName,
      })
      // Add contact info for store display
      addFollowup({
        ...saved,
        cliente: contact.cliente,
        empresa: contact.empresa,
        telefono: contact.telefono,
        vendedor: contact.vendedor,
      })
      toast.success(`Seguimiento agendado para el ${format(new Date(data.scheduled_date + 'T12:00:00'), 'dd/MM/yyyy')}`)
      reset()
      onClose()
    } catch (err) {
      toast.error('Error al agendar: ' + err.message)
    }
  }

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Agendar Seguimiento"
      size="sm"
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
        <Select
          label="Tipo de acción"
          required
          placeholder="Seleccionar..."
          options={ACTION_TYPES.map(a => ({ value: a.value, label: a.label }))}
          error={errors.action_type?.message}
          {...register('action_type')}
        />
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
