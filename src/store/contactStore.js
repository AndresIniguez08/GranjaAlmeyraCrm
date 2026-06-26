import { create } from 'zustand'
import { PAGE_SIZE } from '@/utils/constants'

const useContactStore = create((set, get) => ({
  contacts: [],
  totalCount: 0,
  page: 1,
  pageSize: PAGE_SIZE,
  filters: {},
  loading: false,
  error: null,

  setContacts: (contacts, totalCount) => set({ contacts, totalCount }),
  setPage: (page) => set({ page }),
  setFilters: (filters) => set({ filters, page: 1 }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  addContact: (contact) => set((s) => ({
    contacts: [contact, ...s.contacts],
    totalCount: s.totalCount + 1,
  })),

  updateContact: (updated) => set((s) => ({
    contacts: s.contacts.map(c => c.id === updated.id ? updated : c),
  })),

  removeContact: (id) => set((s) => ({
    contacts: s.contacts.filter(c => c.id !== id),
    totalCount: Math.max(0, s.totalCount - 1),
  })),

  reset: () => set({ contacts: [], totalCount: 0, page: 1, filters: {}, error: null }),
}))

export default useContactStore
