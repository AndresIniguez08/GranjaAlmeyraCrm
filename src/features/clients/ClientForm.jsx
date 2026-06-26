import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Input, Select, Textarea, Button } from '@/components/ui'
import { TIPOS_CLIENTE, ESTADOS_CLIENTE } from '@/utils/constants'
import { clientService } from '@/services/clientService'

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  company: z.string().optional(),
  phone: z.string().min(1, 'El teléfono es requerido'),
  email: z.string().email('Email inválido').or(z.literal('')).optional(),
  address: z.string().optional(),
  type: z.string().min(1, 'El tipo es requerido'),
  status: z.string().min(1, 'El estado es requerido'),
  notes: z.string().optional(),
})

export function ClientForm({ defaultValues, onSubmit, loading }) {
  const [geocoding, setGeocoding] = useState(false)
  const [coords, setCoords] = useState(defaultValues?.coordinates ?? null)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { status: 'Activo' },
  })

  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues)
      setCoords(defaultValues.coordinates ?? null)
    }
  }, [defaultValues, reset])

  const address = watch('address')

  async function geocodeAddress() {
    if (!address?.trim()) return toast.error('Ingresá una dirección primero')
    setGeocoding(true)
    try {
      const result = await clientService.geocodeAddress(address)
      if (!result) return toast.error('No se encontró la dirección')
      setCoords(result)
      toast.success(`Ubicación encontrada: ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`)
    } catch {
      toast.error('Error al geocodificar la dirección')
    } finally {
      setGeocoding(false)
    }
  }

  function useGPS() {
    if (!navigator.geolocation) return toast.error('Tu dispositivo no soporta geolocalización')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setCoords(c)
        toast.success(`GPS: ${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`)
      },
      () => toast.error('No se pudo obtener la ubicación GPS'),
    )
  }

  function handleFormSubmit(data) {
    onSubmit({ ...data, coordinates: coords ?? null })
  }

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

        {/* Dirección + geocodificación */}
        <div className="md:col-span-2 space-y-2">
          <div className="flex gap-2 items-end">
            <Input
              label="Dirección"
              placeholder="Av. Corrientes 1234, CABA, Buenos Aires, Argentina"
              className="flex-1"
              {...register('address')}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={geocoding}
              onClick={geocodeAddress}
              className="shrink-0 mb-[1px]"
            >
              📍 Geocodificar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={useGPS}
              className="shrink-0 mb-[1px]"
            >
              🛰 GPS
            </Button>
          </div>
          {coords && (
            <p className="text-xs text-text-muted bg-green-50 border border-green-200 rounded px-2 py-1">
              ✓ Coordenadas: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              <button type="button" onClick={() => setCoords(null)} className="ml-2 text-red-500 hover:underline">× limpiar</button>
            </p>
          )}
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
