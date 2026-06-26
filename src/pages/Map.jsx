import { useState } from 'react'
import { MapView } from '@/features/map/MapView'
import { MapFilters } from '@/features/map/MapFilters'

export default function Map() {
  const [filters, setFilters] = useState({})

  return (
    // h-full llega hasta el borde de <main> que tiene h-screen
    // overflow-hidden evita el scroll de página — el mapa es interactivo
    <div className="h-full flex flex-col overflow-hidden">

      {/* Barra header + filtros */}
      <div className="flex-shrink-0 flex items-center justify-between gap-4 px-6 py-3 md:px-8 bg-white border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Mapa de Clientes</h1>
          <p className="text-xs text-gray-500 mt-0.5">Distribución geográfica de la cartera</p>
        </div>
        <MapFilters
          onApply={setFilters}
          onReset={() => setFilters({})}
        />
      </div>

      {/* Contenedor del mapa — flex-1 ocupa todo el resto de la pantalla */}
      {/* minHeight: 0 es crítico: sin esto flex-1 no colapsa correctamente en Firefox/Chrome */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <MapView filters={filters} />
      </div>
    </div>
  )
}
