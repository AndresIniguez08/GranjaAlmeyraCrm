import { Table, Badge, Button } from '@/components/ui'
import { Pagination } from '@/components/ui/Pagination'
import { formatDate, cleanPhoneForWhatsApp, truncate } from '@/utils/formatters'
import { getUrgency } from '@/utils/followupUtils'
import { URGENCY_COLORS } from '@/utils/constants'

export function ContactTable({
  contacts, totalCount, page, pageSize,
  onPage, onEdit, onDelete, onView,
  loading, canDelete, followupMap = {},
}) {
  const columns = [
    {
      key: 'fecha',
      header: 'Fecha',
      render: (c) => formatDate(c.fecha),
    },
    {
      key: 'vendedor',
      header: 'Vendedor',
      render: (c) => c.vendedor?.split(' ')[0] ?? '-',
    },
    {
      key: 'cliente',
      header: 'Cliente',
      render: (c) => <span className="font-medium">{c.cliente || '-'}</span>,
    },
    {
      key: 'empresa',
      header: 'Empresa',
      render: (c) => truncate(c.empresa, 25) || '-',
    },
    {
      key: 'producto',
      header: 'Producto',
      render: (c) => <span className="text-xs">{c.producto || '-'}</span>,
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (c) => c.estado ? <Badge label={c.estado} /> : '-',
    },
    {
      key: 'seguimiento',
      header: 'Seguimiento',
      render: (c) => {
        const f = followupMap[c.id]
        if (!f) return <span className="text-xs text-gray-300">—</span>
        const u = getUrgency(f.scheduled_date)
        return (
          <span className={`inline-flex flex-col text-xs px-2 py-1 rounded-lg border leading-tight ${URGENCY_COLORS[u]}`}>
            <span className="font-semibold">{formatDate(f.scheduled_date)}</span>
            <span className="capitalize opacity-80">{f.action_type}</span>
          </span>
        )
      },
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClass: 'text-right',
      className: 'text-right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          {/* WhatsApp */}
          {c.telefono && (
            <a
              href={`https://api.whatsapp.com/send?phone=${cleanPhoneForWhatsApp(c.telefono) ?? c.telefono}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-colors text-sm"
              title="WhatsApp"
            >
              💬
            </a>
          )}
          <Button variant="ghost" size="sm" onClick={() => onView(c)} className="w-7 h-7 p-0" title="Ver">👁</Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(c)} className="w-7 h-7 p-0" title="Editar">✏️</Button>
          {canDelete && (
            <Button variant="ghost" size="sm" onClick={() => onDelete(c.id)} className="w-7 h-7 p-0 hover:bg-red-50 hover:text-red-600" title="Eliminar">🗑</Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <Table
        columns={columns}
        data={contacts}
        loading={loading}
        emptyMessage="No se encontraron contactos con los filtros aplicados"
        keyExtractor={(c) => c.id}
      />
      <Pagination page={page} pageSize={pageSize} totalCount={totalCount} onPage={onPage} />
    </div>
  )
}
