export function Pagination({ page, pageSize, totalCount, onPage }) {
  const totalPages = Math.ceil(totalCount / pageSize)
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  const getPages = () => {
    const pages = []
    const delta = 2
    for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
      pages.push(i)
    }
    if (pages[0] > 1) {
      if (pages[0] > 2) pages.unshift('...')
      pages.unshift(1)
    }
    if (pages[pages.length - 1] < totalPages) {
      if (pages[pages.length - 1] < totalPages - 1) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div className="flex items-center justify-between px-1 py-3">
      <p className="text-sm text-gray-500">
        Mostrando <span className="font-medium text-gray-700">{from}–{to}</span> de{' '}
        <span className="font-medium text-gray-700">{totalCount}</span> registros
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ← Anterior
        </button>

        {getPages().map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-2 text-gray-400">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`w-9 h-9 text-sm rounded-lg border transition-colors ${
                page === p
                  ? 'bg-amber-500 border-amber-500 text-white font-medium'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Siguiente →
        </button>
      </div>
    </div>
  )
}
