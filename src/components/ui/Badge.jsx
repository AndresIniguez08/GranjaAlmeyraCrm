const ESTADO_STYLES = {
  'Vendido':    'bg-green-100 text-green-800 border-green-200',
  'No Vendido': 'bg-red-100 text-red-800 border-red-200',
  'Derivado':   'bg-yellow-100 text-yellow-800 border-yellow-200',
  'No Viable':  'bg-gray-200 text-gray-700 border-gray-300',
  'Activo':     'bg-blue-100 text-blue-800 border-blue-200',
  'Inactivo':   'bg-gray-100 text-gray-700 border-gray-200',
  'Prospecto':  'bg-purple-100 text-purple-800 border-purple-200',
  'admin':      'bg-indigo-100 text-indigo-800 border-indigo-200',
  'vendedor':   'bg-gray-100 text-gray-700 border-gray-200',
}

const TYPE_STYLES = {
  'B2B':          'bg-blue-50 text-blue-700 border-blue-200',
  'Distribuidor': 'bg-green-50 text-green-700 border-green-200',
  'Mayorista':    'bg-orange-50 text-orange-700 border-orange-200',
  'Negocio local':'bg-red-50 text-red-700 border-red-200',
  'Repartidor':   'bg-purple-50 text-purple-700 border-purple-200',
  'Supermercados':'bg-yellow-50 text-yellow-700 border-yellow-200',
}

export function Badge({ label, size = 'sm' }) {
  const sizeClass = size === 'sm'
    ? 'text-[10px] px-2 py-0.5'
    : 'text-xs px-2.5 py-1'

  const style =
    ESTADO_STYLES[label] ||
    TYPE_STYLES[label] ||
    'bg-gray-100 text-gray-700 border-gray-200'

  return (
    <span className={`inline-flex items-center font-semibold rounded-full border uppercase tracking-wide whitespace-nowrap ${sizeClass} ${style}`}>
      {label}
    </span>
  )
}
