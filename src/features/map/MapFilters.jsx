import { useForm } from 'react-hook-form'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { TIPOS_CLIENTE, ESTADOS_CLIENTE } from '@/utils/constants'

// Versión inline — sin posicionamiento absoluto.
// Se monta en la barra de header del mapa.
export function MapFilters({ onApply, onReset }) {
  const { register, handleSubmit, reset } = useForm()

  function onSubmit(data) {
    const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== ''))
    onApply(clean)
  }

  function handleReset() {
    reset({})
    onReset()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-2 flex-wrap">
      <Select
        label="Tipo"
        placeholder="Todos"
        options={TIPOS_CLIENTE}
        className="w-36"
        {...register('type')}
      />
      <Select
        label="Estado"
        placeholder="Todos"
        options={ESTADOS_CLIENTE}
        className="w-32"
        {...register('status')}
      />
      <Button type="submit" size="sm">Filtrar</Button>
      <Button type="button" variant="ghost" size="sm" onClick={handleReset}>Limpiar</Button>
    </form>
  )
}
