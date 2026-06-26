import { Button } from '@/components/ui/Button'

export function ErrorState({ message = 'Ocurrió un error', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="text-5xl">⚠️</div>
      <p className="text-red-600 font-semibold text-sm max-w-sm">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}
