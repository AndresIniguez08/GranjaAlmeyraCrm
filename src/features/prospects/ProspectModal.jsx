import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { supabase } from '@/services/supabase'

const schema = z.object({
  name:        z.string().min(1, 'El nombre es requerido'),
  business:    z.string().optional(),
  phone:       z.string().optional(),
  instagram:   z.string().optional(),
  address:     z.string().optional(),
  notes:       z.string().optional(),
  assigned_to: z.string().optional(),
})

async function fetchVendedores() {
  const { data } = await supabase
    .from('commercial_contacts')
    .select('vendedor')
    .not('vendedor', 'is', null)
    .neq('vendedor', '')
  if (!data) return []
  return [...new Set(data.map((d) => d.vendedor))].sort()
}

export function ProspectModal({ open, onClose, prospect, onSave, loading }) {
  const isEdit = Boolean(prospect)
  const [vendedores, setVendedores] = useState([])

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', business: '', phone: '', instagram: '',
      address: '', notes: '', assigned_to: '',
    },
  })

  useEffect(() => {
    if (open) {
      fetchVendedores().then(setVendedores)
      reset(
        isEdit
          ? {
              name:        prospect.name        ?? '',
              business:    prospect.business    ?? '',
              phone:       prospect.phone       ?? '',
              instagram:   prospect.instagram   ?? '',
              address:     prospect.address     ?? '',
              notes:       prospect.notes       ?? '',
              assigned_to: prospect.assigned_to ?? '',
            }
          : { name: '', business: '', phone: '', instagram: '', address: '', notes: '', assigned_to: '' }
      )
    }
  }, [open, prospect, isEdit, reset])

  async function onSubmit(data) {
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v?.trim() || null])
    )
    await onSave(cleaned)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Editar prospecto` : 'Nuevo prospecto'}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={loading}>
            {isEdit ? 'Guardar cambios' : 'Crear prospecto'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Nombre o negocio"
          required
          placeholder="Ej: Almacén Don Pedro"
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          label="Rubro"
          placeholder="Ej: Almacén, Verdulería, Kiosco..."
          error={errors.business?.message}
          {...register('business')}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Teléfono"
            placeholder="Ej: 11 5555-1234"
            error={errors.phone?.message}
            {...register('phone')}
          />
          <Input
            label="Instagram"
            placeholder="@usuario"
            error={errors.instagram?.message}
            {...register('instagram')}
          />
        </div>

        <Input
          label="Dirección"
          placeholder="Calle, número, localidad"
          error={errors.address?.message}
          {...register('address')}
        />

        <Select
          label="Asignado a"
          placeholder="Sin asignar"
          options={vendedores.map((v) => ({ value: v, label: v }))}
          error={errors.assigned_to?.message}
          {...register('assigned_to')}
        />

        <Textarea
          label="Notas"
          rows={3}
          placeholder="Información adicional, contexto, referencias..."
          error={errors.notes?.message}
          {...register('notes')}
        />
      </form>
    </Modal>
  )
}
