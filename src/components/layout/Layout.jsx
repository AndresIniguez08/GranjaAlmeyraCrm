import { Sidebar } from './Sidebar'
import { GlobalSearch } from '@/components/ui/GlobalSearch'

export function Layout({ children }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      {/* overflow-auto: las páginas con contenido largo scrollean dentro del main */}
      <main className="flex-1 min-w-0 overflow-auto pb-16 md:pb-0">
        {children}
      </main>
    </div>
  )
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center gap-4 pb-5 mb-6 border-b border-gray-200">
      {/* Título */}
      <div className="min-w-0 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-800 whitespace-nowrap">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 font-normal mt-0.5">{subtitle}</p>}
      </div>

      {/* Buscador global — centro */}
      <div className="flex-1 flex justify-center">
        <div className="w-80">
          <GlobalSearch />
        </div>
      </div>

      {/* Acciones — derecha */}
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
