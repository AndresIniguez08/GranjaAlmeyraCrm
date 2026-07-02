import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import {
  getDeliveryZones,
  addDeliveryZone,
  deleteDeliveryZone,
  toggleDelivery,
  recalculateZoneRadius,
} from '@/services/deliveryZoneService'

export function DeliveryZoneManager({ client }) {
  const userName = useAuthStore(s => s.userName)

  const [hasDelivery, setHasDelivery] = useState(client.has_delivery || false)
  const [zones, setZones] = useState([])
  const [newCity, setNewCity] = useState('')
  const [newProvince, setNewProvince] = useState('')
  const [addingZone, setAddingZone] = useState(false)
  const [geoError, setGeoError] = useState(null)
  const [recalculating, setRecalculating] = useState(false)

  useEffect(() => {
    getDeliveryZones(client.id).then(setZones).catch(() => {})
  }, [client.id])

  async function handleToggleDelivery(value) {
    try {
      await toggleDelivery(client.id, value)
      setHasDelivery(value)
    } catch {
      // silently ignore
    }
  }

  async function handleAddZone() {
    if (!newCity.trim()) return
    setAddingZone(true)
    setGeoError(null)
    try {
      const zone = await addDeliveryZone({
        client_id: client.id,
        city: newCity.trim(),
        province: newProvince.trim() || null,
        created_by: userName,
      })
      setZones(prev => [...prev, zone])
      setNewCity('')
      setNewProvince('')
    } catch (err) {
      setGeoError(err.message)
    } finally {
      setAddingZone(false)
    }
  }

  async function handleDeleteZone(id) {
    try {
      await deleteDeliveryZone(id)
      setZones(prev => prev.filter(z => z.id !== id))
    } catch {
      // silently ignore
    }
  }

  async function handleRecalculate() {
    setRecalculating(true)
    try {
      for (const zone of zones) {
        await recalculateZoneRadius(zone.id, zone.city, zone.province)
        await new Promise(r => setTimeout(r, 1000)) // respetar rate limit de Nominatim
      }
      const updated = await getDeliveryZones(client.id)
      setZones(updated)
      toast.success('Zonas recalculadas')
    } catch (err) {
      toast.error(err.message || 'Error al recalcular zonas')
    } finally {
      setRecalculating(false)
    }
  }

  return (
    <div className="mt-6 border-t border-gray-100 pt-4">

      {/* Toggle realiza reparto */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-700">¿Realiza reparto?</p>
          <p className="text-xs text-gray-400">Activá para definir zonas de cobertura en el mapa</p>
        </div>
        <button
          onClick={() => handleToggleDelivery(!hasDelivery)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            hasDelivery ? 'bg-amber-500' : 'bg-gray-200'
          }`}
        >
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            hasDelivery ? 'translate-x-7' : 'translate-x-1'
          }`} />
        </button>
      </div>

      {/* Sección de zonas */}
      {hasDelivery && (
        <div className="space-y-3">

          {zones.some(z => !z.radius || z.radius === 8000) && (
            <button
              onClick={handleRecalculate}
              disabled={recalculating}
              className="text-xs text-amber-600 hover:text-amber-700 underline disabled:opacity-50"
            >
              {recalculating ? 'Recalculando…' : '↻ Recalcular tamaño de zonas'}
            </button>
          )}

          {zones.length > 0 && (
            <div className="space-y-2">
              {zones.map(zone => (
                <div
                  key={zone.id}
                  className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2 border border-blue-100"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-400" />
                    <span className="text-sm font-medium text-gray-700">{zone.city}</span>
                    {zone.province && (
                      <span className="text-xs text-gray-400">{zone.province}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteZone(zone.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Formulario agregar zona */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newCity}
              onChange={e => setNewCity(e.target.value)}
              placeholder="Ciudad (ej: Allen)"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              onKeyDown={e => e.key === 'Enter' && handleAddZone()}
            />
            <input
              type="text"
              value={newProvince}
              onChange={e => setNewProvince(e.target.value)}
              placeholder="Provincia (opcional)"
              className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              onKeyDown={e => e.key === 'Enter' && handleAddZone()}
            />
            <button
              onClick={handleAddZone}
              disabled={!newCity.trim() || addingZone}
              className="px-3 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50 flex items-center gap-1"
            >
              {addingZone ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              Agregar
            </button>
          </div>

          {geoError && (
            <p className="text-xs text-red-500">{geoError}</p>
          )}

          {zones.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">
              Sin zonas de reparto definidas — agregá la primera ciudad arriba
            </p>
          )}
        </div>
      )}
    </div>
  )
}
