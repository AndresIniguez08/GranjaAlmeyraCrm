import { useCallback } from 'react'
import toast from 'react-hot-toast'
import { contactService } from '@/services/contactService'
import useContactStore from '@/store/contactStore'
import useAuthStore from '@/store/authStore'

export function useContacts() {
  const store = useContactStore()
  const { userName } = useAuthStore()

  const load = useCallback(async (overrideFilters) => {
    store.setLoading(true)
    store.setError(null)
    try {
      const filters = overrideFilters ?? store.filters
      const { data, count } = await contactService.getAll({
        page: store.page,
        pageSize: store.pageSize,
        filters,
      })
      store.setContacts(data, count)
    } catch (err) {
      const msg = err.message || 'Error cargando contactos'
      store.setError(msg)
      toast.error(msg)
    } finally {
      store.setLoading(false)
    }
  }, [store])

  const create = useCallback(async (formData) => {
    const contact = {
      ...formData,
      registrado_por: userName,
      fecha_registro: new Date().toISOString(),
    }
    const saved = await contactService.create(contact)
    store.addContact(saved)
    return saved
  }, [store, userName])

  const update = useCallback(async (id, formData) => {
    const updates = {
      ...formData,
      editado_por: userName,
      fecha_edicion: new Date().toISOString(),
    }
    const saved = await contactService.update(id, updates)
    store.updateContact(saved)
    return saved
  }, [store, userName])

  const remove = useCallback(async (id) => {
    await contactService.delete(id)
    store.removeContact(id)
  }, [store])

  const setFilters = useCallback((filters) => {
    store.setFilters(filters)
  }, [store])

  const setPage = useCallback((page) => {
    store.setPage(page)
  }, [store])

  return {
    contacts: store.contacts,
    totalCount: store.totalCount,
    page: store.page,
    pageSize: store.pageSize,
    filters: store.filters,
    loading: store.loading,
    error: store.error,
    load,
    create,
    update,
    remove,
    setFilters,
    setPage,
  }
}
