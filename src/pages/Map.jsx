import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MapPin, Circle } from 'lucide-react'
import { MapView } from '@/features/map/MapView'
import { MapFilters } from '@/features/map/MapFilters'

export default function Map() {
  const location = useLocation()
  const [filters, setFilters] = useState({ status: 'Activo' })
  const [focusClient, setFocusClient] = useState(location.state?.focusClient ?? null)
  const [mapView, setMapView] = useState('clients')

  // Limpiar el history state para que F5 no re-enfoque
  useEffect(() => {
    if (location.state?.focusClient) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, []) // eslint-disable-line

  function clearFocus() {
    setFocusClient(null)
  }

  function handleSetMapView(view) {
    setMapView(view)
    if (view === 'zones') setFocusClient(null)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Barra header + filtros */}
      <div className="flex-shrink-0 flex items-center justify-between gap-4 px-6 py-3 md:px-8 bg-white border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            {mapView === 'zones' ? 'Zonas de Reparto' : 'Mapa de Clientes'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {mapView === 'zones'
              ? 'Cobertura de distribución por cliente'
              : 'Distribución geográfica de la cartera'}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Toggle de vista */}
          <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => handleSetMapView('clients')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mapView === 'clients'
                  ? 'bg-amber-500 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <MapPin size={14} />
              Clientes
            </button>
            <button
              onClick={() => handleSetMapView('zones')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mapView === 'zones'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Circle size={14} />
              Zonas de reparto
            </button>
          </div>

          {/* Filtros de clientes — solo en vista clientes sin foco */}
          {mapView === 'clients' && !focusClient && (
            <MapFilters
              onApply={setFilters}
              onReset={() => setFilters({ status: 'Activo' })}
            />
          )}
        </div>
      </div>

      {/* Contenedor del mapa */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <MapView
          filters={focusClient ? {} : filters}
          focusClient={focusClient}
          mapView={mapView}
        />

        {/* Banner de cliente enfocado */}
        {focusClient && mapView === 'clients' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000]
                          bg-white rounded-xl shadow-lg px-4 py-2 flex items-center gap-3
                          border border-amber-200 pointer-events-auto">
            <MapPin size={16} className="text-amber-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Mostrando: <span className="text-amber-600">{focusClient.name || focusClient.company}</span>
            </span>
            <button
              onClick={clearFocus}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors ml-1"
            >
              Ver todos ✕
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
