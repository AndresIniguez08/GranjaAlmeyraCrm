import { create } from 'zustand'

const useAuthStore = create((set) => ({
  user: null,
  role: null,
  userName: null,
  loading: true,

  setUser: (session) => {
    if (session?.user) {
      const u = session.user
      set({
        user: u,
        role: u.user_metadata?.role ?? null,
        userName: u.user_metadata?.name ?? u.email?.split('@')[0] ?? null,
        loading: false,
      })
    } else {
      set({ user: null, role: null, userName: null, loading: false })
    }
  },

  clearUser: () => set({ user: null, role: null, userName: null, loading: false }),

  setLoading: (loading) => set({ loading }),
}))

export default useAuthStore
