import { useForm } from 'react-hook-form'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { TIPOS_CLIENTE, ESTADOS_CLIENTE } from '@/utils/constants'

export function ClientFilters({ filters, onApply, onReset }) {
  const { register, handleSubmit, reset } = useForm({ defaultValues: filters })

  function onSubmit(data) {
    const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== ''))
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Input
          label="Buscar"
          placeholder="Nombre o empresa..."
          {...register('search')}
        />
        <Select
          label="Tipo"
          placeholder="Todos"
          options={TIPOS_CLIENTE}
          {...register('type')}
        />
        <Select
          label="Estado"
          placeholder="Todos"
          options={ESTADOS_CLIENTE}
          {...register('status')}
        />
      </div>
      <div className="flex gap-2 mt-3">
        <Button type="submit" size="sm">Filtrar</Button>
        <Button type="button" variant="ghost" size="sm" onClick={handleReset}>Limpiar</Button>
      </div>
    </form>
  )
}
