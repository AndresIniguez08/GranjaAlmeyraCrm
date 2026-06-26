import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Phone, MapPin, MessageCircle, Mail, Eye, CheckCircle, XCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { PageHeader } from '@/components/layout/Layout'
import { Button, Badge } from '@/components/ui'
import { Table } from '@/components/ui/Table'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { followupService } from '@/services/followupService'
import useFollowupStore from '@/store/followupStore'
import useAuthStore from '@/store/authStore'
import { CompleteFollowupModal } from '@/features/followups/CompleteFollowupModal'
import { ACTION_TYPES, URGENCY_COLORS } from '@/utils/constants'
import { getUrgency, getUrgencyLabel } from '@/utils/followupUtils'
import { formatDate } from '@/utils/formatters'

const ACTION_ICONS = {
  llamada:  <Phone size={13} className="text-blue-500" />,
  visita:   <MapPin size={13} className="text-green-600" />,
  whatsapp: <MessageCircle size={13} className="text-emerald-600" />,
  email:    <Mail size={13} className="text-violet-600" />,
}

function UrgencyBadge({ date }) {
  const u = getUrgency(date)
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${URGENCY_COLORS[u]}`}>
      {u === 'vencido' ? '🔴' : u === 'hoy' ? '🟡' : '🟢'} {getUrgencyLabel(u)}
    </span>
  )
}

function ActionBadge({ type }) {
  const found = ACTION_TYPES.find(a => a.value === type)
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
      {ACTION_ICONS[type]}
      {found?.label ?? type}
    </span>
  )
}

// ── Tab 1: Pendientes ──────────────────────────────────────────────────────────

function PendingTab({ onNavigateToContact }) {
  const [searchParams] = useSearchParams()
  const initialUrgency = searchParams.get('urgency') ?? 'todos'

  const { pendingFollowups, loading, fetchPendingFollowups, resolveFollowup } = useFollowupStore()
  const { userName } = useAuthStore()

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('todos')
  const [filterUrgency, setFilterUrgency] = useState(initialUrgency)
  const [completing, setCompleting] = useState(null)

  useEffect(() => { fetchPendingFollowups() }, []) // eslint-disable-line

  const filtered = useMemo(() => {
    return pendingFollowups.filter(f => {
      if (filterType !== 'todos' && f.action_type !== filterType) return false
      if (filterUrgency !== 'todos') {
        const u = getUrgency(f.scheduled_date)
        if (filterUrgency === 'proximos') {
          if (u !== 'futuro') return false
        } else {
          if (u !== filterUrgency) return false
        }
      }
      if (search) {
        const q = search.toLowerCase()
        if (!f.cliente?.toLowerCase().includes(q) && !f.empresa?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [pendingFollowups, filterType, filterUrgency, search])

  async function handleCancel(f) {
    if (!confirm(`¿Cancelar el seguimiento con ${f.cliente}?`)) return
    try {
      await followupService.cancelFollowup(f.id, userName)
      resolveFollowup(f.id)
      toast.success('Seguimiento cancelado')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const columns = [
    {
      key: 'fecha',
      header: 'Fecha',
      render: (f) => (
        <div className="space-y-1">
          <div className="text-sm font-medium text-gray-800">{formatDate(f.scheduled_date)}</div>
          <UrgencyBadge date={f.scheduled_date} />
        </div>
      ),
    },
    {
      key: 'contacto',
      header: 'Contacto',
      render: (f) => (
        <div>
          <p className="text-sm font-semibold text-gray-800">{f.cliente}</p>
          <p className="text-xs text-gray-500">{f.empresa}</p>
        </div>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      render: (f) => <ActionBadge type={f.action_type} />,
    },
    {
      key: 'nota',
      header: 'Nota',
      render: (f) => <span className="text-xs text-gray-500">{f.note ? f.note.slice(0, 50) + (f.note.length > 50 ? '…' : '') : '—'}</span>,
    },
    {
      key: 'vendedor',
      header: 'Vendedor',
      render: (f) => <span className="text-xs text-gray-600">{f.vendedor?.split(' ')[0] ?? '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      headerClass: 'text-right',
      className: 'text-right',
      render: (f) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="text-xs gap-1 hover:bg-green-50 hover:text-green-700"
            onClick={() => setCompleting(f)}
          >
            <CheckCircle size={13} /> Completar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs gap-1 hover:bg-gray-100"
            onClick={() => handleCancel(f)}
          >
            <XCircle size={13} /> Cancelar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="w-7 h-7 p-0"
            onClick={() => onNavigateToContact(f.contact_id)}
            title="Ver contacto"
          >
            <Eye size={14} />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 mb-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
        <Input
          label="Buscar"
          placeholder="Contacto o empresa..."
          className="w-48"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Select
          label="Tipo"
          className="w-36"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          options={[
            { value: 'todos', label: 'Todos los tipos' },
            ...ACTION_TYPES.map(a => ({ value: a.value, label: a.label })),
          ]}
        />
        <Select
          label="Urgencia"
          className="w-40"
          value={filterUrgency}
          onChange={e => setFilterUrgency(e.target.value)}
          options={[
            { value: 'todos', label: 'Todos' },
            { value: 'vencido', label: '🔴 Vencidos' },
            { value: 'hoy', label: '🟡 Hoy' },
            { value: 'proximos', label: '🟢 Próximos 7 días' },
          ]}
        />
      </div>

      <Table
        columns={columns}
        data={filtered}
        loading={loading}
        keyExtractor={f => f.id}
        emptyMessage="No hay seguimientos pendientes con estos filtros"
      />

      <CompleteFollowupModal
        open={!!completing}
        onClose={() => setCompleting(null)}
        followup={completing}
      />
    </div>
  )
}

// ── Tab 2: Historial ───────────────────────────────────────────────────────────

function HistorialTab() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  async function load() {
    setLoading(true)
    try {
      const data = await followupService.getHistoryFollowups({ fechaDesde, fechaHasta })
      setHistory(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  const columns = [
    {
      key: 'fecha',
      header: 'Fecha',
      render: (f) => <span className="text-sm text-gray-700">{formatDate(f.scheduled_date)}</span>,
    },
    {
      key: 'contacto',
      header: 'Contacto',
      render: (f) => (
        <div>
          <p className="text-sm font-semibold text-gray-800">{f.cliente}</p>
          <p className="text-xs text-gray-500">{f.empresa}</p>
        </div>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      render: (f) => <ActionBadge type={f.action_type} />,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (f) => <Badge label={f.status} />,
    },
    {
      key: 'resultado',
      header: 'Resultado',
      render: (f) => <span className="text-xs text-gray-500">{f.result_note ? f.result_note.slice(0, 60) + (f.result_note.length > 60 ? '…' : '') : '—'}</span>,
    },
    {
      key: 'completed_by',
      header: 'Completado por',
      render: (f) => <span className="text-xs text-gray-500">{f.completed_by ?? '—'}</span>,
    },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
        <Input label="Desde" type="date" className="w-40" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
        <Input label="Hasta" type="date" className="w-40" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
        <Button size="sm" onClick={load}>Aplicar</Button>
        <Button size="sm" variant="ghost" onClick={() => { setFechaDesde(''); setFechaHasta(''); }}>Limpiar</Button>
      </div>

      <Table
        columns={columns}
        data={history}
        loading={loading}
        keyExtractor={f => f.id}
        emptyMessage="No hay historial con estos filtros"
      />
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function Seguimientos() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('pendientes')
  const { pendingFollowups } = useFollowupStore()

  function handleNavigateToContact(contactId) {
    navigate('/contacts')
    // TODO: podría abrirse el modal del contacto — por ahora navega a la lista
  }

  const tabClass = (t) =>
    `px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
      tab === t
        ? 'border-primary-500 text-primary-700'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Seguimientos"
        subtitle={`${pendingFollowups.length} pendientes`}
      />

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button className={tabClass('pendientes')} onClick={() => setTab('pendientes')}>
          Pendientes
          {pendingFollowups.length > 0 && (
            <span className="ml-2 text-xs bg-primary-500 text-white rounded-full px-1.5 py-0.5">{pendingFollowups.length}</span>
          )}
        </button>
        <button className={tabClass('historial')} onClick={() => setTab('historial')}>
          Historial
        </button>
      </div>

      {tab === 'pendientes'
        ? <PendingTab onNavigateToContact={handleNavigateToContact} />
        : <HistorialTab />
      }
    </div>
  )
}
