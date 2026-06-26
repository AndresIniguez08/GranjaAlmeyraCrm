import { useForm } from 'react-hook-form'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { VENDEDORES, ESTADOS_CONTACTO, PRODUCTOS } from '@/utils/constants'

export function ContactFilters({ filters, onApply, onReset }) {
  const { register, handleSubmit, reset } = useForm({ defaultValues: filters })

  function onSubmit(data) {
    const clean = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== '')
    )
    onApply(clean)
  }

  function handleReset() {
    reset({})
    onReset()
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4"
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Input
          label="Buscar"
          placeholder="Cliente o empresa..."
          {...register('search')}
        />
        <Select
          label="Vendedor"
          placeholder="Todos"
          options={VENDEDORES}
          {...register('vendedor')}
        />
        <Select
          label="Estado"
          placeholder="Todos"
          options={ESTADOS_CONTACTO}
          {...register('estado')}
        />
        <Select
          label="Producto"
          placeholder="Todos"
          options={PRODUCTOS}
          {...register('producto')}
        />
        <Input
          label="Desde"
          type="date"
          {...register('fechaDesde')}
        />
        <Input
          label="Hasta"
          type="date"
          {...register('fechaHasta')}
        />
      </div>
      <div className="flex gap-2 mt-3">
        <Button type="submit" size="sm">Filtrar</Button>
        <Button type="button" variant="ghost" size="sm" onClick={handleReset}>Limpiar</Button>
      </div>
    </form>
  )
}
