import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Select, Textarea, Button } from '@/components/ui'
import { PRODUCTOS, ESTADOS_CONTACTO, VENDEDORES } from '@/utils/constants'
import { PROVINCIAS, PROVINCIAS_LOCALIDADES } from '@/utils/argentina'

const schema = z.object({
  fecha: z.string().min(1, 'La fecha es requerida'),
  vendedor: z.string().min(1, 'El vendedor es requerido'),
  cliente: z.string().min(1, 'El cliente es requerido'),
  empresa: z.string().min(1, 'La empresa es requerida'),
  telefono: z.string().min(1, 'El teléfono es requerido'),
  email: z.string().email('Email inválido').or(z.literal('')).optional(),
  producto: z.string().min(1, 'El producto es requerido'),
  estado: z.string().min(1, 'El estado es requerido'),
  cliente_derivado: z.string().nullish(),
  motivo: z.string().optional(),
  note: z.string().optional(),
  provincia: z.string().optional(),
  localidad: z.string().optional(),
})

async function geocodeLocalidad(localidad, provincia) {
  const query = `${localidad}, ${provincia}, Argentina`
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=ar`,
    { headers: { 'Accept-Language': 'es' } }
  )
  const results = await res.json()
  if (!results.length) return null
  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) }
}

export function ContactForm({ defaultValues, onSubmit, loading, clientOptions = [] }) {
  const today = new Date().toISOString().split('T')[0]
  const [geocoding, setGeocoding] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { fecha: today },
  })

  useEffect(() => {
    if (defaultValues) reset(defaultValues)
  }, [defaultValues, reset])

  const estado = watch('estado')
  const isDerivado = estado === 'Derivado'
  const provincia = watch('provincia')

  const provinciaField = register('provincia')

  async function handleFormSubmit(data) {
    const payload = { ...data }
    if (data.provincia && data.localidad) {
      setGeocoding(true)
      try {
        const coords = await geocodeLocalidad(data.localidad, data.provincia)
        if (coords) payload.mapa_coords = coords
      } catch (err) {
        // Nominatim puede fallar (red, rate-limit) — no debe bloquear el guardado del contacto
        console.warn('Geocoding falló, guardando sin coordenadas:', err)
      } finally {
        setGeocoding(false)
      }
    } else {
      payload.mapa_coords = null
    }
    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Fecha de Contacto"
          type="date"
          required
          error={errors.fecha?.message}
          {...register('fecha')}
        />
        <Select
          label="Vendedor"
          required
          placeholder="Seleccionar vendedor"
          options={VENDEDORES}
          error={errors.vendedor?.message}
          {...register('vendedor')}
        />
        <Input
          label="Cliente"
          required
          placeholder="Nombre del cliente"
          error={errors.cliente?.message}
          {...register('cliente')}
        />
        <Input
          label="Empresa"
          required
          placeholder="Empresa del cliente"
          error={errors.empresa?.message}
          {...register('empresa')}
        />
        <Input
          label="Teléfono"
          type="tel"
          required
          placeholder="Ej: 1155667788"
          error={errors.telefono?.message}
          {...register('telefono')}
        />
        <Input
          label="Email"
          type="email"
          placeholder="correo@ejemplo.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Select
          label="Producto Solicitado"
          required
          placeholder="Seleccionar producto"
          options={PRODUCTOS}
          error={errors.producto?.message}
          {...register('producto')}
        />
        <Select
          label="Estado"
          required
          placeholder="Seleccionar estado"
          options={ESTADOS_CONTACTO}
          error={errors.estado?.message}
          {...register('estado')}
        />
        {isDerivado && (
          <div className="md:col-span-2">
            {clientOptions.length > 0 ? (
              <Select
                label="Cliente de Derivación"
                placeholder="Seleccionar cliente"
                options={clientOptions.map(c => ({ value: c.company, label: c.company }))}
                error={errors.cliente_derivado?.message}
                {...register('cliente_derivado')}
              />
            ) : (
              <Input
                label="Cliente de Derivación"
                placeholder="Nombre del cliente al que se deriva"
                error={errors.cliente_derivado?.message}
                {...register('cliente_derivado')}
              />
            )}
          </div>
        )}
        <Textarea
          label="Motivo / Observaciones"
          placeholder="Motivo de la decisión u observaciones relevantes"
          rows={2}
          className="md:col-span-2"
          {...register('motivo')}
        />
        <Textarea
          label="Nota interna"
          placeholder="Nota adicional (solo visible internamente)"
          rows={2}
          className="md:col-span-2"
          {...register('note')}
        />
      </div>

      <div className="border-t border-gray-100 pt-4 mt-2">
        <p className="text-sm font-semibold text-gray-700 mb-3">
          Ubicación geográfica
          <span className="text-gray-400 font-normal ml-1">(opcional)</span>
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Provincia"
            placeholder="Seleccionar provincia..."
            options={PROVINCIAS}
            {...provinciaField}
            onChange={(e) => {
              provinciaField.onChange(e)
              setValue('localidad', '')
            }}
          />
          <Select
            label="Localidad"
            placeholder={provincia ? 'Seleccionar localidad...' : 'Primero seleccioná provincia'}
            options={provincia ? PROVINCIAS_LOCALIDADES[provincia] ?? [] : []}
            disabled={!provincia}
            {...register('localidad')}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" loading={loading || geocoding} size="md">
          {geocoding ? 'Ubicando...' : defaultValues?.id ? 'Guardar Cambios' : 'Registrar Contacto'}
        </Button>
      </div>
    </form>
  )
}
