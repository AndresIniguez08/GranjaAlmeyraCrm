export function Pagination({ page, pageSize, totalCount, onPage }) {
  const totalPages = Math.ceil(totalCount / pageSize)
  if (totalPages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalCount)

  return (
    <div className="flex items-center justify-between py-3 px-1">
      <span className="text-xs text-text-muted">
        Mostrando {start}–{end} de {totalCount}
      </span>
      <div className="flex items-center gap-1">
        <PageBtn onClick={() => onPage(1)} disabled={page === 1}>«</PageBtn>
        <PageBtn onClick={() => onPage(page - 1)} disabled={page === 1}>‹</PageBtn>
        <span className="text-xs font-semibold text-text-secondary px-3">
          {page} / {totalPages}
        </span>
        <PageBtn onClick={() => onPage(page + 1)} disabled={page === totalPages}>›</PageBtn>
        <PageBtn onClick={() => onPage(totalPages)} disabled={page === totalPages}>»</PageBtn>
      </div>
    </div>
  )
}

function PageBtn({ onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-7 h-7 flex items-center justify-center rounded-lg text-sm font-bold transition-colors
        disabled:opacity-40 disabled:cursor-not-allowed
        hover:bg-primary hover:text-text-primary
        text-text-secondary"
    >
      {children}
    </button>
  )
}
