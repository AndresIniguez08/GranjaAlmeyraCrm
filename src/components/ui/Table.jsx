import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

/**
 * columns: [{ key, header, render?, className? }]
 */
export function Table({ columns, data, loading, emptyMessage = 'Sin datos', keyExtractor }) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!data.length) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-100">
      <table className="w-full text-sm bg-white" style={{ minWidth: 600 }}>
        <thead>
          <tr className="bg-gradient-to-r from-primary to-primary-light text-text-primary">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left font-bold text-xs uppercase tracking-wide ${col.headerClass || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const rowKey = keyExtractor ? keyExtractor(row) : row.id ?? i
            return (
              <tr
                key={rowKey}
                className="border-t border-gray-100 hover:bg-yellow-50/40 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-text-secondary align-middle ${col.className || ''}`}
                  >
                    {col.render ? col.render(row) : row[col.key] ?? '-'}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
