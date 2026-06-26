export function EmptyState({ message = 'Sin datos', icon, cta }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="text-5xl opacity-30">
        {icon ?? '📋'}
      </div>
      <p className="text-text-muted font-medium text-sm max-w-xs">{message}</p>
      {cta && <div>{cta}</div>}
    </div>
  )
}
