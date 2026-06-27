import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PROSPECT_RESULTS } from '@/utils/constants'

function parseLocalDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function ProspectList({ prospects, onEdit, onDelete, loading }) {
  const [confirmId, setConfirmId] = useState(null)

  function getLastAttempt(attempts) {
    if (!attempts?.length) return null
    return attempts[attempts.length - 1]
  }

  async function handleDelete(id) {
    if (confirmId !== id) {
      setConfirmId(id)
      return
    }
    setConfirmId(null)
    await onDelete(id)
  }

  if (prospects.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        No hay prospectos todavía
      </div>
    )
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-xl">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {['Nombre', 'Negocio', 'Teléfono', 'Instagram', 'Intentos', 'Último contacto', 'Acciones'].map(
              (col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                >
                  {col}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {prospects.map((p, idx) => {
            const lastAttempt = getLastAttempt(p.attempts)
            const resultInfo  = lastAttempt ? PROSPECT_RESULTS[lastAttempt.result] : null
            const lastDate    = lastAttempt ? parseLocalDate(lastAttempt.attempt_date) : null

            return (
              <tr
                key={p.id}
                className={`border-b border-gray-100 hover:bg-amber-50/40 transition-colors ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                }`}
              >
                {/* Nombre */}
                <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                  {p.name}
                </td>

                {/* Negocio */}
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {p.business || <span className="text-gray-300">—</span>}
                </td>

                {/* Teléfono */}
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {p.phone || <span className="text-gray-300">—</span>}
                </td>

                {/* Instagram */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {p.instagram ? (
                    <span className="text-pink-500">
                      @{p.instagram.replace(/^@/, '')}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>

                {/* Intentos */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700">
                      {p.attempts?.length ?? 0}
                    </span>
                    {resultInfo && (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: resultInfo.bg, color: resultInfo.text }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: resultInfo.color }}
                        />
                        {resultInfo.label}
                      </span>
                    )}
                  </div>
                </td>

                {/* Último contacto */}
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {lastDate ? (
                    format(lastDate, "d MMM yyyy", { locale: es })
                  ) : (
                    <span className="text-gray-300">Sin intentos</span>
                  )}
                </td>

                {/* Acciones */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onEdit(p)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      title="Editar prospecto"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={loading}
                      className={`p-1.5 rounded-lg transition-colors ${
                        confirmId === p.id
                          ? 'bg-red-100 text-red-600'
                          : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                      }`}
                      title={confirmId === p.id ? '¿Confirmar?' : 'Eliminar prospecto'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
