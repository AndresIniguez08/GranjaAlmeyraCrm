import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, User, Building2, Target, MessageCircle } from 'lucide-react'
import { globalSearch } from '@/services/searchService'

export function GlobalSearch() {
  const navigate = useNavigate()
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState({ contacts: [], clients: [], prospects: [] })
  const [loading, setLoading] = useState(false)
  const [isOpen,  setIsOpen]  = useState(false)
  const searchRef = useRef(null)
  const inputRef  = useRef(null)

  // Debounce 300ms
  useEffect(() => {
    if (query.length < 2) {
      setResults({ contacts: [], clients: [], prospects: [] })
      setIsOpen(false)
      return
    }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await globalSearch(query)
        setResults(data)
        setIsOpen(true)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // Cerrar al click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Ctrl+K / Cmd+K para enfocar; Escape para limpiar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
        setQuery('')
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  function go(path) {
    navigate(path)
    setIsOpen(false)
    setQuery('')
  }

  const totalResults =
    results.contacts.length + results.clients.length + results.prospects.length

  const ESTADO_COLOR = {
    'Vendido':    'bg-green-100 text-green-700',
    'No Vendido': 'bg-red-100 text-red-700',
  }

  return (
    <div ref={searchRef} className="relative">
      {/* Input */}
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar... (Ctrl+K)"
          className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200
                     rounded-xl outline-none focus:ring-2 focus:ring-amber-400
                     focus:border-transparent placeholder-gray-400 transition-shadow"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border
                     border-gray-200 shadow-xl z-50 overflow-hidden max-h-[480px] overflow-y-auto"
        >
          {totalResults === 0 && !loading && (
            <div className="p-4 text-center text-sm text-gray-500">
              No se encontraron resultados para "{query}"
            </div>
          )}

          {/* Contactos comerciales */}
          {results.contacts.length > 0 && (
            <section>
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 sticky top-0">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Contactos Comerciales — {results.contacts.length} resultado{results.contacts.length > 1 ? 's' : ''}
                </span>
              </div>
              {results.contacts.map(c => (
                <button
                  key={c.id}
                  onClick={() => go('/contacts')}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-amber-50
                             transition-colors text-left border-b border-gray-50 last:border-0"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <User size={13} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{c.cliente}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {[c.empresa, c.producto].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium
                    ${ESTADO_COLOR[c.estado] ?? 'bg-amber-100 text-amber-700'}`}>
                    {c.estado}
                  </span>
                </button>
              ))}
            </section>
          )}

          {/* Clientes */}
          {results.clients.length > 0 && (
            <section>
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 sticky top-0">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Base de Clientes — {results.clients.length} resultado{results.clients.length > 1 ? 's' : ''}
                </span>
              </div>
              {results.clients.map(c => (
                <button
                  key={c.id}
                  onClick={() => go('/clients')}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-amber-50
                             transition-colors text-left border-b border-gray-50 last:border-0"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Building2 size={13} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {[c.company, c.type].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium
                    ${c.status === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {c.status}
                  </span>
                </button>
              ))}
            </section>
          )}

          {/* Prospectos */}
          {results.prospects.length > 0 && (
            <section>
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 sticky top-0">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Prospectos — {results.prospects.length} resultado{results.prospects.length > 1 ? 's' : ''}
                </span>
              </div>
              {results.prospects.map(p => (
                <button
                  key={p.id}
                  onClick={() => go('/prospectos')}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-amber-50
                             transition-colors text-left border-b border-gray-50 last:border-0"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Target size={13} className="text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {[p.business || 'Sin rubro', p.instagram].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {p.phone && (
                    <a
                      href={`https://api.whatsapp.com/send?phone=54${p.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex-shrink-0 p-1.5 rounded-lg text-green-500 hover:bg-green-50 transition-colors"
                      title="WhatsApp"
                    >
                      <MessageCircle size={13} />
                    </a>
                  )}
                </button>
              ))}
            </section>
          )}

          {/* Footer */}
          {totalResults > 0 && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-center">
              <span className="text-xs text-gray-400">
                {totalResults} resultado{totalResults > 1 ? 's' : ''} para "{query}"
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
