import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { contactService } from '@/services/contactService'
import { clientService } from '@/services/clientService'
import { ReportCharts } from '@/features/reports/ReportCharts'
import { ExportButton } from '@/features/reports/ExportButton'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/layout/Layout'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export default function Reports() {
  const [contacts, setContacts] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({})

  const { register, handleSubmit, reset } = useForm()

  useEffect(() => {
    load(filters)
  }, []) // eslint-disable-line

  async function load(f = {}) {
    setLoading(true)
    try {
      const [c, cl] = await Promise.all([
        contactService.getAllForReports(f),
        clientService.getAllForReports(),
      ])
      setContacts(c)
      setClients(cl)
    } catch {
      // silently fail — charts show empty state
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(data) {
    const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== ''))
    setFilters(clean)
    load(clean)
  }

  function handleReset() {
    reset({})
    setFilters({})
    load({})
  }

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Reportes y Estadísticas"
        subtitle={`${contacts.length} contactos · ${clients.length} clientes`}
        action={<ExportButton />}
      />

      {/* Filtro por rango de fechas */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6 flex items-end gap-3 flex-wrap"
      >
        <Input label="Desde" type="date" className="w-40" {...register('fechaDesde')} />
        <Input label="Hasta" type="date" className="w-40" {...register('fechaHasta')} />
        <Button type="submit" size="sm">Aplicar</Button>
        <Button type="button" variant="ghost" size="sm" onClick={handleReset}>Limpiar</Button>
      </form>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <ReportCharts contacts={contacts} clients={clients} />
      )}
    </div>
  )
}
