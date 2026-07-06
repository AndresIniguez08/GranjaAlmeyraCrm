import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { FullPageSpinner } from '@/components/shared/LoadingSpinner'
import { Layout } from '@/components/layout/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Contacts from '@/pages/Contacts'
import Clients from '@/pages/Clients'
import MapPage from '@/pages/Map'
import ContactMap from '@/pages/ContactMap'
import Reports from '@/pages/Reports'
import Seguimientos from '@/pages/Seguimientos'
import Prospectos from '@/pages/Prospectos'
import Usuarios from '@/pages/Usuarios'
import Objetivos from '@/pages/Objetivos'
import AdminRoute from '@/components/shared/AdminRoute'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

function AppContent() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contacts"
        element={
          <ProtectedRoute>
            <Contacts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients"
        element={
          <ProtectedRoute>
            <Clients />
          </ProtectedRoute>
        }
      />
      <Route
        path="/map"
        element={
          <ProtectedRoute>
            <MapPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mapa-contactos"
        element={
          <ProtectedRoute>
            <ContactMap />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seguimientos"
        element={
          <ProtectedRoute>
            <Seguimientos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/prospectos"
        element={
          <ProtectedRoute>
            <Prospectos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/objetivos"
        element={
          <ProtectedRoute>
            <Objetivos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Usuarios />
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            fontSize: '14px',
            borderRadius: '10px',
          },
          success: { iconTheme: { primary: '#ffd700', secondary: '#333' } },
        }}
      />
      <AppContent />
    </BrowserRouter>
  )
}
