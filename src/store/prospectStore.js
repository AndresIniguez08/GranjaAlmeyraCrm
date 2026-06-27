import { create } from 'zustand'
import * as prospectService from '@/services/prospectService'

const useProspectStore = create((set) => ({
  prospects: [],
  loading: false,

  fetchProspects: async () => {
    set({ loading: true })
    try {
      const data = await prospectService.getProspectsWithAttempts()
      set({ prospects: data, loading: false })
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },

  addProspect: (prospect) =>
    set((s) => ({ prospects: [prospect, ...s.prospects] })),

  updateProspect: (id, updated) =>
    set((s) => ({
      prospects: s.prospects.map((p) =>
        p.id === id ? { ...p, ...updated } : p
      ),
    })),

  removeProspect: (id) =>
    set((s) => ({ prospects: s.prospects.filter((p) => p.id !== id) })),

  addAttempt: (prospectId, attempt) =>
    set((s) => ({
      prospects: s.prospects.map((p) =>
        p.id === prospectId
          ? {
              ...p,
              attempts: [...(p.attempts || []), attempt].sort((a, b) =>
                a.attempt_date.localeCompare(b.attempt_date)
              ),
            }
          : p
      ),
    })),

  updateAttempt: (prospectId, attemptId, data) =>
    set((s) => ({
      prospects: s.prospects.map((p) =>
        p.id === prospectId
          ? {
              ...p,
              attempts: p.attempts.map((a) =>
                a.id === attemptId ? { ...a, ...data } : a
              ),
            }
          : p
      ),
    })),

  removeAttempt: (prospectId, attemptId) =>
    set((s) => ({
      prospects: s.prospects.map((p) =>
        p.id === prospectId
          ? { ...p, attempts: p.attempts.filter((a) => a.id !== attemptId) }
          : p
      ),
    })),
}))

export default useProspectStore
