import { useCallback } from 'react'
import toast from 'react-hot-toast'
import { clientService } from '@/services/clientService'
import useClientStore from '@/store/clientStore'
import useAuthStore from '@/store/authStore'

export function useClients() {
  const store = useClientStore()
  const { userName } = useAuthStore()

  const load = useCallback(async (overrideFilters) => {
    store.setLoading(true)
    store.setError(null)
    try {
      const filters = overrideFilters ?? store.filters
      const { data, count } = await clientService.getAll({
        page: store.page,
        pageSize: store.pageSize,
        filters,
      })
      store.setClients(data, count)
    } catch (err) {
      const msg = err.message || 'Error cargando clientes'
      store.setError(msg)
      toast.error(msg)
    } finally {
      store.setLoading(false)
    }
  }, [store])

  const loadAll = useCallback(async () => {
    try {
      const data = await clientService.getAllForMap()
      store.setAllClients(data)
      return data
    } catch (err) {
      toast.error('Error cargando clientes para mapa')
      return []
    }
  }, [store])

  const create = useCallback(async (formData) => {
    const client = {
      ...formData,
      registered_by: userName,
      registered_at: new Date().toISOString(),
    }
    const saved = await clientService.create(client)
    store.addClient(saved)
    return saved
  }, [store, userName])

  const update = useCallback(async (id, formData) => {
    const saved = await clientService.update(id, formData)
    store.updateClient(saved)
    return saved
  }, [store])

  const remove = useCallback(async (id) => {
    await clientService.delete(id, userName)
    store.removeClient(id)
  }, [store, userName])

  const setFilters = useCallback((filters) => {
    store.setFilters(filters)
  }, [store])

  const setPage = useCallback((page) => {
    store.setPage(page)
  }, [store])

  return {
    clients: store.clients,
    allClients: store.allClients,
    totalCount: store.totalCount,
    page: store.page,
    pageSize: store.pageSize,
    filters: store.filters,
    loading: store.loading,
    error: store.error,
    load,
    loadAll,
    create,
    update,
    remove,
    setFilters,
    setPage,
  }
}
