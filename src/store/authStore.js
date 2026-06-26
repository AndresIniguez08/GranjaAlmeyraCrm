import { create } from 'zustand'

const useAuthStore = create((set) => ({
  user: null,
  role: null,
  userName: null,
  loading: true,

  setUser: (user) => set({
    user,
    role: user?.user_metadata?.role ?? null,
    userName: user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? null,
    loading: false,
  }),

  clearUser: () => set({ user: null, role: null, userName: null, loading: false }),

  setLoading: (loading) => set({ loading }),
}))

export default useAuthStore
