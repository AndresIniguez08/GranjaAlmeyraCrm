import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

const inputClass = 'w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-gray-400'
const errorClass = 'text-xs text-red-600 font-medium mt-0.5'
const labelClass = 'text-sm font-semibold text-gray-700'

export function ResetPasswordModal({ open, onClose, user, onSave, loading }) {
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors,          setErrors]          = useState({})

  useEffect(() => {
    if (open) {
      setNewPassword('')
      setConfirmPassword('')
      setErrors({})
    }
  }, [open])

  function validate() {
    const errs = {}
    if (!newPassword)          errs.newPassword = 'La contraseña es requerida'
    if (newPassword.length < 8) errs.newPassword = 'Mínimo 8 caracteres'
    if (newPassword !== confirmPassword) errs.confirmPassword = 'Las contraseñas no coinciden'
    return errs
  }

  async function handleSave() {
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    await onSave(newPassword)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Resetear contraseña de ${user?.name ?? ''}`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} loading={loading}>Guardar contraseña</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Nueva contraseña <span className="text-red-500">*</span></label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className={inputClass}
            autoFocus
          />
          {errors.newPassword && <p className={errorClass}>{errors.newPassword}</p>}
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
      </div>
    </Modal>
  )
}
