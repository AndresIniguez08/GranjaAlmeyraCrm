import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import toast from 'react-hot-toast'
import { Input, Button } from '@/components/ui'

const ARGENTINA_DEFAULT = { lat: -38.4161, lng: -63.6167 }
const ZOOM_DEFAULT = 4
const ZOOM_LOCATED = 15

const goldIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:24px;height:24px;
    background:#F59E0B;
    border:3px solid white;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    box-shadow:0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
})

function MapUpdater({ center, zoom }) {
  const map = useMap()
  const { lat, lng } = center
  const firstRef = useRef(true)

  useEffect(() => {
    if (firstRef.current) { firstRef.current = false; return }
    map.setView([lat, lng], zoom, { animate: true })
  }, [lat, lng, zoom, map])

  return null
}

function DraggableMarker({ position, onDragEnd }) {
  const markerRef = useRef(null)

  const eventHandlers = useMemo(() => ({
    dragend() {
      const m = markerRef.current
      if (m) {
        const { lat, lng } = m.getLatLng()
        onDragEnd({ lat, lng })
      }
    },
  }), [onDragEnd])

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={[position.lat, position.lng]}
      ref={markerRef}
      icon={goldIcon}
    />
  )
}

export default function LocationPicker({
  initialCoords = null,
  initialAddress = '',
  onLocationChange,
  onAddressChange,
  height = '280px',
}) {
  const [address, setAddress]           = useState(initialAddress)
  const [mapCoords, setMapCoords]       = useState(initialCoords ?? ARGENTINA_DEFAULT)
  const [mapZoom, setMapZoom]           = useState(initialCoords ? ZOOM_LOCATED : ZOOM_DEFAULT)
  const [geocodeStatus, setGeocodeStatus] = useState(initialCoords ? 'success' : null)
  const [hasLocation, setHasLocation]   = useState(!!initialCoords)
  const [geocoding, setGeocoding]       = useState(false)

  function handleAddressInput(e) {
    setAddress(e.target.value)
    onAddressChange?.(e.target.value)
  }

  async function geocode() {
    if (!address?.trim()) return toast.error('Ingresá una dirección primero')
    setGeocoding(true)
    setGeocodeStatus('loading')
    try {
      const query = address.toLowerCase().includes('argentina')
        ? address
        : `${address}, Argentina`
      const url =
        `https://nominatim.openstreetmap.org/search` +
        `?q=${encodeURIComponent(query)}` +
        `&format=json&limit=3&countrycodes=ar&addressdetails=1`
      const res  = await fetch(url, { headers: { 'Accept-Language': 'es' } })
      const data = await res.json()
      if (data.length > 0) {
        const newCoords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
        setMapCoords(newCoords)
        setMapZoom(ZOOM_LOCATED)
        setGeocodeStatus('success')
        setHasLocation(true)
        onLocationChange?.(newCoords)
      } else {
        setGeocodeStatus('error')
        toast.error('No se encontró la dirección — arrastrá el marcador al lugar exacto')
      }
    } catch {
      setGeocodeStatus('error')
      toast.error('Error al geocodificar')
    } finally {
      setGeocoding(false)
    }
  }

  function handleGPS() {
    if (!navigator.geolocation) return toast.error('Tu dispositivo no soporta geolocalización')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setMapCoords(newCoords)
        setMapZoom(16)
        setGeocodeStatus('manual')
        setHasLocation(true)
        onLocationChange?.(newCoords)
      },
      () => toast.error('No se pudo obtener la ubicación GPS'),
    )
  }

  const handleMarkerDrag = useCallback((newCoords) => {
    setMapCoords(newCoords)
    setGeocodeStatus('manual')
    setHasLocation(true)
    onLocationChange?.(newCoords)
  }, [onLocationChange])

  const statusLabel = {
    success: '✓ Ubicado automáticamente',
    manual:  '📍 Posición ajustada manualmente',
    error:   '⚠️ No se encontró — arrastrá el marcador',
    loading: 'Buscando dirección…',
  }[geocodeStatus] ?? 'Arrastrá el marcador para ubicar manualmente'

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-end">
        <Input
          label="Dirección"
          placeholder="Av. Corrientes 1234, CABA, Buenos Aires"
          className="flex-1"
          value={address}
          onChange={handleAddressInput}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={geocoding}
          onClick={geocode}
          className="shrink-0 mb-[1px]"
        >
          📍 Geocodificar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleGPS}
          className="shrink-0 mb-[1px]"
        >
          🛰 GPS
        </Button>
      </div>

      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <MapContainer
          center={[mapCoords.lat, mapCoords.lng]}
          zoom={mapZoom}
          style={{ height, width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <DraggableMarker position={mapCoords} onDragEnd={handleMarkerDrag} />
          <MapUpdater center={mapCoords} zoom={mapZoom} />
        </MapContainer>

        <div className="bg-gray-50 px-3 py-2 flex items-center justify-between border-t border-gray-200">
          <span className="text-xs text-gray-500">{statusLabel}</span>
          <span className="text-xs text-gray-400 tabular-nums">
            {mapCoords.lat.toFixed(6)}, {mapCoords.lng.toFixed(6)}
          </span>
        </div>
      </div>
    </div>
  )
}
