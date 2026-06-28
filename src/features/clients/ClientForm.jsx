import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Select, Textarea, Button } from '@/components/ui'
import LocationPicker from '@/components/ui/LocationPicker'
import { TIPOS_CLIENTE, ESTADOS_CLIENTE } from '@/utils/constants'

const schema = z.object({
  name:    z.string().min(1, 'El nombre es requerido'),
  company: z.string().optional(),
  phone:   z.string().min(1, 'El teléfono es requerido'),
  email:   z.string().email('Email inválido').or(z.literal('')).optional(),
  type:    z.string().min(1, 'El tipo es requerido'),
  status:  z.string().min(1, 'El estado es requerido'),
  notes:   z.string().optional(),
})

export function ClientForm({ defaultValues, onSubmit, loading }) {
  const [address,     setAddress]     = useState(defaultValues?.address     ?? '')
  const [coordinates, setCoordinates] = useState(defaultValues?.coordinates ?? null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { status: 'Activo' },
  })

  // Reinicializar cuando cambia el cliente que se está editando
  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues)
      setAddress(defaultValues.address ?? '')
      setCoordinates(defaultValues.coordinates ?? null)
    }
  }, [defaultValues, reset])

  function handleFormSubmit(data) {
    onSubmit({ ...data, address: address || null, coordinates })
  }

  // Clave estable por cliente → LocationPicker se recrea solo al abrir un cliente distinto
  const mapKey = defaultValues?.id ?? 'new'

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Nombre"
          required
          placeholder="Nombre completo"
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label="Empresa"
          placeholder="Nombre de la empresa"
          error={errors.company?.message}
          {...register('company')}
        />
        <Input
          label="Teléfono"
          type="tel"
          required
          placeholder="Ej: 1155667788"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <Input
          label="Email"
          type="email"
          placeholder="correo@ejemplo.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="md:col-span-2">
          <LocationPicker
            key={mapKey}
            initialCoords={coordinates}
            initialAddress={address}
            onLocationChange={setCoordinates}
            onAddressChange={setAddress}
          />
        </div>

        <Select
          label="Tipo de Cliente"
          required
          placeholder="Seleccionar tipo"
          options={TIPOS_CLIENTE}
          error={errors.type?.message}
          {...register('type')}
        />
        <Select
          label="Estado"
          required
          options={ESTADOS_CLIENTE}
          error={errors.status?.message}
          {...register('status')}
        />
        <Textarea
          label="Notas"
          placeholder="Información adicional sobre el cliente"
          rows={2}
          className="md:col-span-2"
          {...register('notes')}
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={loading} size="md">
          {defaultValues?.id ? 'Guardar Cambios' : 'Registrar Cliente'}
        </Button>
      </div>
    </form>
  )
}
