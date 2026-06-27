import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Select, Textarea, Button } from '@/components/ui'
import { PRODUCTOS, ESTADOS_CONTACTO, VENDEDORES } from '@/utils/constants'

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
})

export function ContactForm({ defaultValues, onSubmit, loading, clientOptions = [] }) {
  const today = new Date().toISOString().split('T')[0]

  const {
    register,
    handleSubmit,
    watch,
    reset,
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" loading={loading} size="md">
          {defaultValues?.id ? 'Guardar Cambios' : 'Registrar Contacto'}
        </Button>
      </div>
    </form>
  )
}
