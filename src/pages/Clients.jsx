import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useClients } from '@/hooks/useClients'
import useAuthStore from '@/store/authStore'
import { clientService } from '@/services/clientService'
import { ClientFilters } from '@/features/clients/ClientFilters'
import { ClientTable } from '@/features/clients/ClientTable'
import { ClientForm } from '@/features/clients/ClientForm'
import { ClientViewModal } from '@/features/clients/ClientModal'
import { Modal, Button } from '@/components/ui'
import { PageHeader } from '@/components/layout/Layout'
import { exportClients } from '@/utils/exporters'
import { ROLES } from '@/utils/constants'

export default function Clients() {
  const { role } = useAuthStore()
  const isAdmin = role === ROLES.ADMIN
  const {
    clients, totalCount, page, pageSize, filters, loading,
    load, create, update, remove, setFilters, setPage,
  } = useClients()

  const [formOpen, setFormOpen] = useState(false)
  const [viewClient, setViewClient] = useState(null)
  const [editClient, setEditClient] = useState(null)
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => { load() }, []) // eslint-disable-line
  useEffect(() => { load() }, [page, filters]) // eslint-disable-line

  const handleApplyFilters = useCallback((f) => setFilters(f), [setFilters])
  const handleResetFilters = useCallback(() => setFilters({}), [setFilters])

  async function handleCreate(data) {
    setFormLoading(true)
    try {
      await create(data)
      toast.success('Cliente registrado exitosamente')
      setFormOpen(false)
    } catch (err) {
      toast.error('Error al guardar: ' + err.message)
    } finally {
      setFormLoading(false)
    }
  }

  async function handleEdit(data) {
    setFormLoading(true)
    try {
      await update(editClient.id, data)
      toast.success('Cliente actualizado')
      setEditClient(null)
    } catch (err) {
      toast.error('Error al actualizar: ' + err.message)
    } finally {
      setFormLoading(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Confirmás eliminar este cliente? Esta acción no se puede deshacer.')) return
    try {
      await remove(id)
      toast.success('Cliente eliminado')
    } catch (err) {
      toast.error('Error al eliminar: ' + err.message)
    }
  }

  async function handleExport() {
    try {
      const data = await clientService.getAll({ pageSize: 9999 })
      exportClients(data.data)
      toast.success(`${data.data.length} clientes exportados`)
    } catch (err) {
      toast.error('Error al exportar: ' + err.message)
    }
  }

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Base de Clientes"
        subtitle={`${totalCount} clientes registrados`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleExport}>📥 Exportar CSV</Button>
            <Button size="sm" onClick={() => setFormOpen(true)}>+ Nuevo Cliente</Button>
          </div>
        }
      />

      <ClientFilters filters={filters} onApply={handleApplyFilters} onReset={handleResetFilters} />

      <ClientTable
        clients={clients}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        loading={loading}
        canDelete={isAdmin}
        onPage={setPage}
        onView={setViewClient}
        onEdit={setEditClient}
        onDelete={handleDelete}
      />

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Registrar Nuevo Cliente" size="lg">
        <ClientForm loading={formLoading} onSubmit={handleCreate} />
      </Modal>

      <Modal open={!!editClient} onClose={() => setEditClient(null)} title="Editar Cliente" size="lg">
        {editClient && (
          <ClientForm defaultValues={editClient} loading={formLoading} onSubmit={handleEdit} />
        )}
      </Modal>

      <ClientViewModal
        client={viewClient}
        open={!!viewClient}
        onClose={() => setViewClient(null)}
        onEdit={(c) => { setViewClient(null); setEditClient(c) }}
      />
    </div>
  )
}
