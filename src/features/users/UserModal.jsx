import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

const ROLES = [
  { value: 'admin',    label: 'Administrador' },
  { value: 'vendedor', label: 'Vendedor'       },
]

const inputClass = 'w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-gray-400'
const errorClass = 'text-xs text-red-600 font-medium mt-0.5'
const labelClass = 'text-sm font-semibold text-gray-700'

export function UserModal({ open, onClose, user, onSave, loading }) {
  const isEdit = Boolean(user)

  const [name,            setName]            = useState('')
  const [username,        setUsername]        = useState('')
  const [role,            setRole]            = useState('vendedor')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors,          setErrors]          = useState({})

  useEffect(() => {
    if (open) {
      setName(user?.name ?? '')
      setUsername(user?.username ?? '')
      setRole(user?.role ?? 'vendedor')
      setPassword('')
      setConfirmPassword('')
      setErrors({})
    }
  }, [open, user])

  function validate() {
    const errs = {}
    if (!name.trim())     errs.name = 'El nombre es requerido'
    if (!isEdit) {
      if (!username.trim()) errs.username = 'El usuario es requerido'
      if (!/^[a-z0-9._]+$/i.test(username.trim())) errs.username = 'Solo letras, números, puntos y guiones'
      if (!password)        errs.password = 'La contraseña es requerida'
      if (password.length < 8) errs.password = 'Mínimo 8 caracteres'
      if (password !== confirmPassword) errs.confirmPassword = 'Las contraseñas no coinciden'
    }
    return errs
  }

  async function handleSave() {
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    await onSave({ name: name.trim(), username: username.trim(), role, password })
  }

  const emailPreview = username.trim()
    ? `${username.trim().toLowerCase()}@crm.internal`
    : null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar usuario' : 'Nuevo usuario'}
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} loading={loading}>
            {isEdit ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Nombre */}
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Nombre completo <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: María González"
            className={inputClass}
          />
          {errors.name && <p className={errorClass}>{errors.name}</p>}
        </div>

        {/* Username — solo en crear */}
        {!isEdit && (
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Nombre de usuario <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="Ej: maria.gonzalez"
              className={inputClass}
            />
            {emailPreview && (
              <p className="text-xs text-gray-400 mt-0.5">
                Ingresará como: <span className="font-medium text-gray-600">{emailPreview}</span>
              </p>
            )}
            {errors.username && <p className={errorClass}>{errors.username}</p>}
          </div>
        )}

        {/* Rol */}
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Rol</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={inputClass}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* Contraseña — solo en crear */}
        {!isEdit && (
          <>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Contraseña inicial <span className="text-red-500">*</span></label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className={inputClass}
              />
              {errors.password && <p className={errorClass}>{errors.password}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Confirmar contraseña <span className="text-red-500">*</span></label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repetir contraseña"
                className={inputClass}
              />
              {errors.confirmPassword && <p className={errorClass}>{errors.confirmPassword}</p>}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
