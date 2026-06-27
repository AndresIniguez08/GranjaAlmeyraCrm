import { create } from 'zustand'
import { followupService } from '@/services/followupService'

const useFollowupStore = create((set) => ({
  pendingFollowups: [],
  loading: false,
  error: null,

  fetchPendingFollowups: async () => {
    set({ loading: true, error: null })
    try {
      const data = await followupService.getPendingFollowups()
      set({ pendingFollowups: data, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  addFollowup: (followup) => set((s) => ({
    pendingFollowups: [...s.pendingFollowups, followup]
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)),
  })),

  resolveFollowup: (id) => set((s) => ({
    pendingFollowups: s.pendingFollowups.filter(f => f.id !== id),
  })),
}))

export default useFollowupStore
