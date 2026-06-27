import { useState } from 'react'
import { UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal, Button, Select, Input, Textarea } from '@/components/ui'
import { clientService } from '@/services/clientService'
import useClientStore from '@/store/clientStore'
import useAuthStore from '@/store/authStore'
import { TIPOS_CLIENTE } from '@/utils/constants'

export function ConvertToClientModal({ open, onClose, contact }) {
  const { userName } = useAuthStore()
  const addClient = useClientStore(s => s.addClient)

  const [type, setType] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [typeError, setTypeError] = useState('')

  function handleClose() {
    setType('')
    setEmail('')
    setAddress('')
    setNotes('')
    setTypeError('')
    onClose()
  }

  async function handleCreate() {
    if (!type) {
      setTypeError('Seleccioná un tipo de cliente')
      return
    }
    setTypeError('')
    setSaving(true)

    try {
      const payload = {
        name: contact.cliente,
        company: contact.empresa || null,
        phone: contact.telefono || null,
        type,
        status: 'Activo',
        email: email || null,
        address: address || null,
        notes: notes || null,
        registered_by: userName,
        registered_at: new Date().toISOString(),
      }

      let newClient = await clientService.create(payload)

      if (address) {
        try {
          const coords = await clientService.geocodeAddress(address)
          if (coords) {
            newClient = await clientService.update(newClient.id, { coordinates: coords })
          }
        } catch {
          // Geocodificación falla silenciosamente — el cliente igual se crea
        }
      }

      addClient(newClient)
      toast.success('✓ Cliente creado — ya aparece en el mapa')
      handleClose()
    } catch (err) {
      toast.error('Error al crear cliente: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!contact) return null

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="¿Convertir a cliente?"
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={saving}>
            Ahora no
          </Button>
          <Button size="sm" onClick={handleCreate} loading={saving}>
            Crear cliente →
          </Button>
        </>
      }
    >
      {/* Ícono + subtítulo */}
      <div className="flex items-start gap-3 mb-5 p-3 bg-green-50 border border-green-200 rounded-lg">
        <UserCheck size={20} className="text-green-600 shrink-0 mt-0.5" />
        <p className="text-sm text-green-800">
          <span className="font-semibold">{contact.cliente}</span> acaba de ser marcado como{' '}
          <span className="font-semibold">Vendido</span>. ¿Querés agregarlo a la base de clientes?
        </p>
      </div>

      {/* Datos precargados (solo informativos) */}
      <div className="mb-4 space-y-1 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700">
        <div className="flex gap-2">
          <span className="text-gray-400 w-20 shrink-0">Nombre</span>
          <span className="font-medium">{contact.cliente}</span>
        </div>
        {contact.empresa && (
          <div className="flex gap-2">
            <span className="text-gray-400 w-20 shrink-0">Empresa</span>
            <span>{contact.empresa}</span>
          </div>
        )}
        {contact.telefono && (
          <div className="flex gap-2">
            <span className="text-gray-400 w-20 shrink-0">Teléfono</span>
            <span>{contact.telefono}</span>
          </div>
        )}
      </div>

      {/* Campos a completar */}
      <div className="space-y-3">
        <Select
          label="Tipo de cliente"
          required
          placeholder="Seleccionar tipo..."
          options={TIPOS_CLIENTE.map(t => ({ value: t, label: t }))}
          value={type}
          onChange={e => { setType(e.target.value); setTypeError('') }}
          error={typeError}
        />
        <Input
          label="Email"
          type="email"
          placeholder="correo@ejemplo.com (opcional)"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <Input
          label="Dirección"
          placeholder="Para ubicar en el mapa (opcional)"
          value={address}
          onChange={e => setAddress(e.target.value)}
        />
        <Textarea
          label="Notas"
          placeholder="Observaciones adicionales (opcional)"
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>
    </Modal>
  )
}
