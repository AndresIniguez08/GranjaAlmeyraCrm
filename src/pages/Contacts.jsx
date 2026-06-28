import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useContacts } from '@/hooks/useContacts'
import useAuthStore from '@/store/authStore'
import { clientService } from '@/services/clientService'
import { contactService } from '@/services/contactService'
import { ContactFilters } from '@/features/contacts/ContactFilters'
import { ContactTable } from '@/features/contacts/ContactTable'
import { ContactForm } from '@/features/contacts/ContactForm'
import { ContactViewModal } from '@/features/contacts/ContactModal'
import { FollowupModal } from '@/features/followups/FollowupModal'
import { CompleteFollowupModal } from '@/features/followups/CompleteFollowupModal'
import { ConvertToClientModal } from '@/features/clients/ConvertToClientModal'
import { Modal, Button } from '@/components/ui'
import { PageHeader } from '@/components/layout/Layout'
import { exportContacts } from '@/utils/exporters'
import { ROLES } from '@/utils/constants'

export default function Contacts() {
  const { role } = useAuthStore()
  const isAdmin = role === ROLES.ADMIN
  const {
    contacts, totalCount, page, pageSize, filters, loading,
    load, create, update, remove, setFilters, setPage,
  } = useContacts()

  const [followupMap, setFollowupMap] = useState({})
  const [followupContact, setFollowupContact] = useState(null)
  const [completeFollowup, setCompleteFollowup] = useState(null)
  const openCompleteModal = useCallback((followup) => setCompleteFollowup(followup), [])

  const loadFollowupsMap = useCallback(async (list) => {
    if (!list?.length) return
    try {
      const map = await contactService.getPendingFollowupsByContacts(list.map(c => c.id))
      setFollowupMap(map)
    } catch (_) { /* silencioso — la tabla sigue funcionando sin el mapa */ }
  }, [])

  useEffect(() => {
    if (contacts.length > 0) loadFollowupsMap(contacts)
    else setFollowupMap({})
  }, [contacts, loadFollowupsMap])

  const openFollowupModal = useCallback((contact) => setFollowupContact(contact), [])
  const closeFollowupModal = useCallback(() => {
    setFollowupContact(null)
    loadFollowupsMap(contacts)
  }, [contacts, loadFollowupsMap])

  const [clientOptions, setClientOptions] = useState([])
  const [formOpen, setFormOpen] = useState(false)
  const [viewContact, setViewContact] = useState(null)
  const [editContact, setEditContact] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [convertContact, setConvertContact] = useState(null)

  // Cargar datos iniciales
  useEffect(() => { load() }, []) // eslint-disable-line
  useEffect(() => { load() }, [page, filters]) // eslint-disable-line

  // Cargar opciones de clientes para derivación
  useEffect(() => {
    clientService.getAllForSelect().then(setClientOptions).catch(() => {})
  }, [])

  const handleApplyFilters = useCallback((f) => {
    setFilters(f)
  }, [setFilters])

  const handleResetFilters = useCallback(() => {
    setFilters({})
  }, [setFilters])

  async function handleCreate(data) {
    setFormLoading(true)
    try {
      await create(data)
      toast.success('Contacto registrado exitosamente')
      setFormOpen(false)
    } catch (err) {
      toast.error('Error al guardar: ' + err.message)
    } finally {
      setFormLoading(false)
    }
  }

  async function handleEdit(data) {
    setFormLoading(true)
    const previousEstado = editContact?.estado
    try {
      await update(editContact.id, data)
      toast.success('Contacto actualizado')
      const saved = { ...editContact, ...data }
      setEditContact(null)
      if (data.estado === 'Vendido' && previousEstado !== 'Vendido') {
        setConvertContact(saved)
      }
    } catch (err) {
      toast.error('Error al actualizar: ' + err.message)
    } finally {
      setFormLoading(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Confirmás eliminar este contacto? Esta acción no se puede deshacer.')) return
    try {
      await remove(id)
      toast.success('Contacto eliminado')
    } catch (err) {
      toast.error('Error al eliminar: ' + err.message)
    }
  }

  async function handleExport() {
    try {
      const data = await contactService.getAllForExport(filters)
      exportContacts(data)
      toast.success(`${data.length} contactos exportados`)
    } catch (err) {
      toast.error('Error al exportar: ' + err.message)
    }
  }

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Contactos Comerciales"
        subtitle={`${totalCount} registros totales`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleExport}>📥 Exportar CSV</Button>
            <Button size="sm" onClick={() => setFormOpen(true)}>+ Nuevo Contacto</Button>
          </div>
        }
      />

      <ContactFilters filters={filters} onApply={handleApplyFilters} onReset={handleResetFilters} />

      <ContactTable
        contacts={contacts}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        loading={loading}
        canDelete={isAdmin}
        followupMap={followupMap}
        onPage={setPage}
        onView={setViewContact}
        onEdit={setEditContact}
        onDelete={handleDelete}
        onScheduleFollowup={openFollowupModal}
        onCompleteFollowup={openCompleteModal}
      />

      {/* Modal: nuevo contacto */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Registrar Nuevo Contacto"
        size="lg"
      >
        <ContactForm
          clientOptions={clientOptions}
          loading={formLoading}
          onSubmit={handleCreate}
        />
      </Modal>

      {/* Modal: editar contacto */}
      <Modal
        open={!!editContact}
        onClose={() => setEditContact(null)}
        title="Editar Contacto"
        size="lg"
      >
        {editContact && (
          <ContactForm
            defaultValues={editContact}
            clientOptions={clientOptions}
            loading={formLoading}
            onSubmit={handleEdit}
          />
        )}
      </Modal>

      {/* Modal: ver contacto */}
      <ContactViewModal
        contact={viewContact}
        open={!!viewContact}
        onClose={() => setViewContact(null)}
        onEdit={(c) => { setViewContact(null); setEditContact(c) }}
      />

      {/* Modal: agendar seguimiento desde tabla */}
      {followupContact && (
        <FollowupModal
          open={true}
          contact={followupContact}
          onClose={closeFollowupModal}
        />
      )}

      {/* Modal: completar seguimiento desde badge de tabla */}
      {completeFollowup && (
        <CompleteFollowupModal
          open={true}
          followup={completeFollowup}
          onClose={() => {
            setCompleteFollowup(null)
            loadFollowupsMap(contacts)
          }}
        />
      )}

      {/* Modal: convertir contacto Vendido en cliente */}
      <ConvertToClientModal
        open={!!convertContact}
        onClose={() => setConvertContact(null)}
        contact={convertContact}
      />
    </div>
  )
}
