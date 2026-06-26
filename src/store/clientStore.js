import { create } from 'zustand'
import { PAGE_SIZE } from '@/utils/constants'

const useClientStore = create((set) => ({
  clients: [],
  allClients: [],
  totalCount: 0,
  page: 1,
  pageSize: PAGE_SIZE,
  filters: {},
  loading: false,
  error: null,

  setClients: (clients, totalCount) => set({ clients, totalCount }),
  setAllClients: (allClients) => set({ allClients }),
  setPage: (page) => set({ page }),
  setFilters: (filters) => set({ filters, page: 1 }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  addClient: (client) => set((s) => ({
    clients: [client, ...s.clients],
    allClients: [client, ...s.allClients],
    totalCount: s.totalCount + 1,
  })),

  updateClient: (updated) => set((s) => ({
    clients: s.clients.map(c => c.id === updated.id ? updated : c),
    allClients: s.allClients.map(c => c.id === updated.id ? updated : c),
  })),

  removeClient: (id) => set((s) => ({
    clients: s.clients.filter(c => c.id !== id),
    allClients: s.allClients.filter(c => c.id !== id),
    totalCount: Math.max(0, s.totalCount - 1),
  })),

  reset: () => set({ clients: [], allClients: [], totalCount: 0, page: 1, filters: {}, error: null }),
}))

export default useClientStore
