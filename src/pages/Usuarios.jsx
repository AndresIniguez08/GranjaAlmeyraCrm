import { useEffect, useState, useCallback } from 'react'
import { Pencil, Key, Power, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { userService } from '@/services/userService'
import useAuthStore from '@/store/authStore'
import { PageHeader } from '@/components/layout/Layout'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { UserModal } from '@/features/users/UserModal'
import { ResetPasswordModal } from '@/features/users/ResetPasswordModal'
import ChangeOwnPasswordModal from '@/features/users/ChangeOwnPasswordModal'

function RoleBadge({ role }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
        Administrador
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
      Vendedor
    </span>
  )
}

function StatusBadge({ active }) {
  if (active) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Activo
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      Inactivo
    </span>
  )
}

function Avatar({ name }) {
  return (
    <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

function formatLastLogin(dateStr) {
  if (!dateStr) return 'Nunca'
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: es })
  } catch {
    return 'Nunca'
  }
}

export default function Usuarios() {
  const { user: currentUser, role: currentRole, userName: currentUserName } = useAuthStore()
  const currentUsername = currentUser?.email?.replace('@crm.internal', '') ?? ''

  const [users,           setUsers]           = useState([])
  const [loading,         setLoading]         = useState(true)
  const [userModal,       setUserModal]       = useState({ open: false, user: null })
  const [resetModal,      setResetModal]      = useState({ open: false, user: null })
  const [ownPassModal,    setOwnPassModal]    = useState(false)
  const [savingModal,     setSavingModal]     = useState(false)
  const [togglingId,      setTogglingId]      = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deletingId,      setDeletingId]      = useState(null)

  const loadUsers = useCallback(async () => {
    try {
      const data = await userService.listUsers()
      setUsers(data)
    } catch (err) {
      toast.error('Error al cargar usuarios: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async function handleSaveUser({ name, username, role, password }) {
    setSavingModal(true)
    try {
      if (userModal.user) {
        await userService.updateUser(userModal.user.id, name, role)
        toast.success('Usuario actualizado')
      } else {
        await userService.createUser(username, name, role, password)
        toast.success('Usuario creado')
      }
      setUserModal({ open: false, user: null })
      await loadUsers()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingModal(false)
    }
  }

  async function handleResetPassword(newPassword) {
    setSavingModal(true)
    try {
      await userService.resetPassword(resetModal.user.id, newPassword)
      toast.success('Contraseña reseteada')
      setResetModal({ open: false, user: null })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingModal(false)
    }
  }

  async function handleToggle(user) {
    setTogglingId(user.id)
    try {
      await userService.toggleUser(user.id, !user.active)
      toast.success(user.active ? 'Usuario desactivado' : 'Usuario activado')
      await loadUsers()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(userId) {
    if (confirmDeleteId !== userId) {
      setConfirmDeleteId(userId)
      return
    }
    setConfirmDeleteId(null)
    setDeletingId(userId)
    try {
      await userService.deleteUser(userId)
      toast.success('Usuario eliminado')
      await loadUsers()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Gestión de Usuarios"
        subtitle="Administrá los accesos al CRM"
        action={
          <Button size="sm" onClick={() => setUserModal({ open: true, user: null })}>
            + Nuevo Usuario
          </Button>
        }
      />

      {/* ── Tabla de usuarios ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Nombre', 'Usuario', 'Rol', 'Último acceso', 'Estado', 'Acciones'].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => {
                  const isSelf = user.id === currentUser?.id
                  const isToggling = togglingId === user.id
                  const isDeleting = deletingId === user.id
                  const isConfirmingDelete = confirmDeleteId === user.id

                  return (
                    <tr
                      key={user.id}
                      className={`border-b border-gray-100 hover:bg-amber-50/30 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      }`}
                    >
                      {/* Nombre */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={user.name} />
                          <span className="font-semibold text-gray-900">{user.name}</span>
                        </div>
                      </td>

                      {/* Usuario */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-gray-500 text-sm">{user.username}</span>
                      </td>

                      {/* Rol */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <RoleBadge role={user.role} />
                      </td>

                      {/* Último acceso */}
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-sm">
                        {formatLastLogin(user.last_sign_in)}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge active={user.active} />
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isSelf ? (
                          <span className="text-xs text-gray-400 italic">Tu cuenta</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            {/* Editar */}
                            <button
                              onClick={() => setUserModal({ open: true, user })}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                              title="Editar usuario"
                            >
                              <Pencil size={14} />
                            </button>

                            {/* Reset contraseña */}
                            <button
                              onClick={() => setResetModal({ open: true, user })}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Resetear contraseña"
                            >
                              <Key size={14} />
                            </button>

                            {/* Activar/Desactivar */}
                            <button
                              onClick={() => handleToggle(user)}
                              disabled={isToggling}
                              className={`p-1.5 rounded-lg transition-colors ${
                                user.active
                                  ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={user.active ? 'Desactivar' : 'Activar'}
                            >
                              <Power size={14} />
                            </button>

                            {/* Eliminar */}
                            <button
                              onClick={() => handleDelete(user.id)}
                              disabled={isDeleting}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isConfirmingDelete
                                  ? 'bg-red-100 text-red-600'
                                  : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                              }`}
                              title={isConfirmingDelete ? '¿Confirmar eliminación?' : 'Eliminar usuario'}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Mi cuenta ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 max-w-md">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Mi cuenta</h3>
        <div className="flex items-center gap-3 mb-4">
          <Avatar name={currentUserName} />
          <div>
            <p className="font-semibold text-gray-900 text-sm">{currentUserName}</p>
            <p className="text-xs text-gray-500">{currentUsername}</p>
          </div>
          <div className="ml-auto">
            <RoleBadge role={currentRole} />
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setOwnPassModal(true)}>
          Cambiar mi contraseña
        </Button>
      </div>

      {/* ── Modales ───────────────────────────────────────────────────────── */}
      <UserModal
        open={userModal.open}
        onClose={() => setUserModal({ open: false, user: null })}
        user={userModal.user}
        onSave={handleSaveUser}
        loading={savingModal}
      />

      <ResetPasswordModal
        open={resetModal.open}
        onClose={() => setResetModal({ open: false, user: null })}
        user={resetModal.user}
        onSave={handleResetPassword}
        loading={savingModal}
      />

      {ownPassModal && (
        <ChangeOwnPasswordModal
          onClose={() => setOwnPassModal(false)}
        />
      )}
    </div>
  )
}
