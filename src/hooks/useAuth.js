import { useEffect } from 'react'
import { authService } from '@/services/authService'
import useAuthStore from '@/store/authStore'

export function useAuth() {
  const { user, role, userName, loading, setUser, clearUser } = useAuthStore()

  useEffect(() => {
    // Cargar sesión inicial
    authService.getSession().then(session => {
      setUser(session)
    }).catch(() => clearUser())

    // Escuchar cambios de auth
    const { data: { subscription } } = authService.onAuthChange((session) => {
      setUser(session)
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { user, role, userName, loading, isAdmin: role === 'admin' }
}
