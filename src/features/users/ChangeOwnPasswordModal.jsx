import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { userService } from '@/services/userService'
import toast from 'react-hot-toast'

const schema = z.object({
  newPassword: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

export default function ChangeOwnPasswordModal({ onClose }) {
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await userService.changeOwnPassword(data.newPassword)
      toast.success('Contraseña actualizada correctamente')
      onClose()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={true} title="Cambiar mi contraseña" onClose={onClose} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          {...register('newPassword')}
          label="Nueva contraseña"
          type="password"
          placeholder="Mínimo 8 caracteres"
          error={errors.newPassword?.message}
        />
        <Input
          {...register('confirmPassword')}
          label="Confirmar contraseña"
          type="password"
          placeholder="Repetí la contraseña"
          error={errors.confirmPassword?.message}
        />
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <Button type="submit" loading={loading}>
            Guardar contraseña
          </Button>
        </div>
      </form>
    </Modal>
  )
}
