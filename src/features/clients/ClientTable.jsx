import { useNavigate } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { Table, Badge, Button } from '@/components/ui'
import { Pagination } from '@/components/ui/Pagination'
import { formatDate, cleanPhoneForWhatsApp, truncate } from '@/utils/formatters'

export function ClientTable({
  clients, totalCount, page, pageSize,
  onPage, onEdit, onDelete, onView,
  loading, canDelete,
}) {
  const navigate = useNavigate()
  const columns = [
    {
      key: 'name',
      header: 'Nombre',
      render: (c) => <span className="font-medium">{c.name || '-'}</span>,
    },
    {
      key: 'company',
      header: 'Empresa',
      render: (c) => truncate(c.company, 28) || '-',
    },
    {
      key: 'phone',
      header: 'Teléfono',
      render: (c) => c.phone || '-',
    },
    {
      key: 'email',
      header: 'Email',
      render: (c) => truncate(c.email, 22) || '-',
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (c) => c.type ? <Badge label={c.type} /> : '-',
    },
    {
      key: 'status',
      header: 'Estado',
      render: (c) => c.status ? <Badge label={c.status} /> : '-',
    },
    {
      key: 'registered_at',
      header: 'Registro',
      render: (c) => formatDate(c.registered_at),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClass: 'text-right',
      className: 'text-right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          {c.phone && (
            <a
              href={`https://api.whatsapp.com/send?phone=${cleanPhoneForWhatsApp(c.phone) ?? c.phone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-colors text-sm"
              title="WhatsApp"
            >
              💬
            </a>
          )}
          {c.coordinates && (
            <button
              onClick={() => navigate('/map', { state: { focusClient: c } })}
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
              title="Ver en mapa"
            >
              <MapPin size={15} />
            </button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onView(c)} className="w-7 h-7 p-0" title="Ver">👁</Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(c)} className="w-7 h-7 p-0" title="Editar">✏️</Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(c)} className="w-7 h-7 p-0 hover:bg-red-50 hover:text-red-600" title="Eliminar">🗑</Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <Table
        columns={columns}
        data={clients}
        loading={loading}
        emptyMessage="No se encontraron clientes con los filtros aplicados"
        keyExtractor={(c) => c.id}
      />
      <Pagination page={page} pageSize={pageSize} totalCount={totalCount} onPage={onPage} />
    </div>
  )
}
