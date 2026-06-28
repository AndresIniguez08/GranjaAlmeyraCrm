import useAuthStore from '@/store/authStore'
import { Navigate } from 'react-router-dom'

export default function AdminRoute({ children }) {
  const { role } = useAuthStore()
  if (role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}
