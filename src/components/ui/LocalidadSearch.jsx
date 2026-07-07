import { useEffect, useRef, useState } from 'react'
import { MapPin, X } from 'lucide-react'

const NOMINATIM_TYPES = ['city', 'town', 'village', 'municipality', 'suburb', 'neighbourhood', 'hamlet']

function extractProvincia(address) {
  return address?.state || address?.province || address?.region || ''
}

function extractLocalidad(result) {
  return result.address?.city ||
    result.address?.town ||
    result.address?.village ||
    result.address?.suburb ||
    result.address?.neighbourhood ||
    result.name ||
    ''
}

export default function LocalidadSearch({ value, onChange, placeholder }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState(value || null)
  const searchRef = useRef(null)

  useEffect(() => {
    if (value?.localidad) {
      setQuery(value.provincia ? `${value.localidad}, ${value.provincia}` : value.localidad)
      setSelected(value)
    } else if (!value) {
      setQuery('')
      setSelected(null)
    }
  }, [value])

  useEffect(() => {
    if (query.length < 3 || selected) return

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Argentina')}&format=json&limit=6&countrycodes=ar&addressdetails=1`,
          { headers: { 'Accept-Language': 'es', 'User-Agent': 'CRM-GranjaAlmeyra/1.0' } }
        )
        const results = await res.json()
        const filtered = results.filter(r => NOMINATIM_TYPES.includes(r.type))
        setSuggestions(filtered)
        setIsOpen(filtered.length > 0)
      } catch (e) {
        console.error('Nominatim error:', e)
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [query, selected])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (result) => {
    const localidad = extractLocalidad(result)
    const provincia = extractProvincia(result.address)
    const coords = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) }
    const displayText = provincia ? `${localidad}, ${provincia}` : localidad

    setQuery(displayText)
    setSelected({ localidad, provincia, coords })
    setIsOpen(false)
    setSuggestions([])

    onChange({ localidad, provincia, coords })
  }

  const handleClear = () => {
    setQuery('')
    setSelected(null)
    setSuggestions([])
    setIsOpen(false)
    onChange(null)
  }

  const handleInputChange = (e) => {
    setQuery(e.target.value)
    setSelected(null)
    if (e.target.value.length < 3) {
      setSuggestions([])
      setIsOpen(false)
    }
  }

  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder || 'Buscar localidad...'}
          className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm
                     focus:ring-2 focus:ring-amber-400 focus:border-transparent"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading && (
            <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent
                            rounded-full animate-spin" />
          )}
          {selected && !loading && (
            <button type="button" onClick={handleClear} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl
                        border border-gray-200 shadow-lg z-50 overflow-hidden max-h-[220px]
                        overflow-y-auto">
          {suggestions.map((result, i) => {
            const localidad = extractLocalidad(result)
            const provincia = extractProvincia(result.address)
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(result)}
                className="w-full px-4 py-2.5 text-left hover:bg-amber-50
                           transition-colors border-b border-gray-50 last:border-0
                           flex items-center gap-3"
              >
                <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{localidad}</p>
                  {provincia && (
                    <p className="text-xs text-gray-400">{provincia}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {isOpen && suggestions.length === 0 && !loading && query.length >= 3 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl
                        border border-gray-200 shadow-lg z-50 p-3 text-center">
          <p className="text-sm text-gray-500">Sin resultados para &quot;{query}&quot;</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Intentá con otro nombre o agregá la provincia
          </p>
        </div>
      )}

      {selected && (
        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
          <span>✓</span> {selected.localidad}{selected.provincia ? `, ${selected.provincia}` : ''}
        </p>
      )}
    </div>
  )
}
