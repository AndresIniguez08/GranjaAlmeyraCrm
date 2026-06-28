import { useState, useEffect, useMemo } from 'react'
import { format, parseISO, addMonths, isSameMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { PageHeader } from '@/components/layout/Layout'
import {
  getGoalsByMonth,
  getActualsByMonth,
  getVendedoresList,
  getContactsByVendedorMonth,
} from '@/services/goalsService'
import { getProgressColor, getProgressMessage, getMonthStart } from '@/utils/goalsUtils'
import { GoalModal } from '@/features/goals/GoalModal'

// ── ProgressBar ───────────────────────────────────────────────────────────────

function ProgressBar({ actual, goal }) {
  if (!goal) {
    return (
      <div>
        <div className="h-2.5 bg-gray-100 rounded-full" />
        <p className="text-xs text-gray-400 mt-1">Sin objetivo definido</p>
      </div>
    )
  }
  const rawPct = actual / goal * 100
  const clampedPct = Math.min(Math.round(rawPct), 100)
  const colorClass = getProgressColor(Math.round(rawPct))
  const isOver = rawPct >= 100

  return (
    <div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} rounded-full transition-all duration-500`}
          style={{ width: `${clampedPct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs mt-1">
        <span className={isOver ? 'text-green-600 font-medium' : 'text-gray-500'}>
          {actual} de {goal}
        </span>
        <span className={isOver ? 'text-green-600 font-bold' : 'text-gray-500'}>
          {Math.round(rawPct)}%{isOver ? ' ✓' : ''}
        </span>
      </div>
    </div>
  )
}

// ── BigProgressCard (vista vendedor) ──────────────────────────────────────────

function BigProgressCard({ label, icon, actual, goal }) {
  if (!goal) {
    return (
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">{icon}</span>
          <p className="font-semibold text-gray-700">{label}</p>
        </div>
        <p className="text-sm text-gray-400">Sin objetivo definido para este mes</p>
        <p className="text-xs text-gray-400 mt-1">El administrador aún no cargó los objetivos</p>
      </div>
    )
  }

  const rawPct = goal > 0 ? actual / goal * 100 : 0
  const clampedPct = Math.min(Math.round(rawPct), 100)
  const colorClass = getProgressColor(Math.round(rawPct))
  const isOver = rawPct >= 100
  const message = getProgressMessage(actual, goal)

  return (
    <div className={`rounded-2xl border p-6 ${isOver ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 shadow-sm'}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{icon}</span>
        <p className="font-semibold text-gray-700">{label}</p>
      </div>

      <div className="flex items-end gap-2 mb-4">
        <span className={`text-4xl font-bold ${isOver ? 'text-green-600' : 'text-gray-900'}`}>
          {actual}
        </span>
        <span className="text-xl text-gray-400 mb-1">/ {goal}</span>
      </div>

      <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full ${colorClass} rounded-full transition-all duration-700`}
          style={{ width: `${clampedPct}%` }}
        />
      </div>

      <p className={`text-sm font-medium ${isOver ? 'text-green-700' : 'text-gray-600'}`}>
        {message}
      </p>
      <p className="text-xs text-gray-400 mt-1">{Math.round(rawPct)}% completado</p>
    </div>
  )
}

// ── AdminView ─────────────────────────────────────────────────────────────────

function AdminView({ vendors, goalsMap, actuals, teamTotals, onEdit, onDefine }) {
  return (
    <div>
      {/* Cards resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 border-l-4 border-l-amber-400">
          <p className="text-sm font-medium text-gray-500 mb-1">Total contactos</p>
          <p className="text-3xl font-bold text-gray-800">
            {teamTotals.contacts}
            {teamTotals.goalContacts > 0 && (
              <span className="text-lg text-gray-400 font-normal"> / {teamTotals.goalContacts}</span>
            )}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 border-l-4 border-l-green-400">
          <p className="text-sm font-medium text-gray-500 mb-1">Total vendidos</p>
          <p className="text-3xl font-bold text-gray-800">
            {teamTotals.sales}
            {teamTotals.goalSales > 0 && (
              <span className="text-lg text-gray-400 font-normal"> / {teamTotals.goalSales}</span>
            )}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 border-l-4 border-l-blue-400">
          <p className="text-sm font-medium text-gray-500 mb-1">Tasa del equipo</p>
          <p className="text-3xl font-bold text-gray-800">
            {teamTotals.contacts > 0
              ? Math.round(teamTotals.sales / teamTotals.contacts * 100)
              : 0}%
          </p>
        </div>
      </div>

      {/* Tabla comparativa */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['Vendedor', 'Contactos', 'Ventas cerradas', 'Acciones'].map(col => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vendors.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">
                  No hay vendedores con actividad en este período
                </td>
              </tr>
            )}
            {vendors.map((v, idx) => {
              const goal   = goalsMap[v]
              const actual = actuals[v] ?? { contacts: 0, sales: 0 }

              return (
                <tr
                  key={v}
                  className={`border-b border-gray-100 hover:bg-amber-50/30 transition-colors ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                  }`}
                >
                  <td className="px-4 py-4 font-semibold text-gray-900 whitespace-nowrap">
                    {v}
                  </td>
                  <td className="px-4 py-4" style={{ minWidth: 200 }}>
                    <ProgressBar actual={actual.contacts} goal={goal?.goal_contacts} />
                  </td>
                  <td className="px-4 py-4" style={{ minWidth: 200 }}>
                    <ProgressBar actual={actual.sales} goal={goal?.goal_sales} />
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {goal ? (
                      <button
                        onClick={() => onEdit(v)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        title="Editar objetivo"
                      >
                        <Pencil size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => onDefine(v)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 transition-colors"
                      >
                        Definir
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── VendorView ────────────────────────────────────────────────────────────────

const ESTADO_COLORS = {
  'Vendido':    'bg-green-100 text-green-700',
  'No Vendido': 'bg-red-100 text-red-600',
  'Derivado':   'bg-purple-100 text-purple-700',
}

const ITEMS_PER_PAGE = 10

function VendorView({ myGoal, myActuals, contacts }) {
  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(contacts.length / ITEMS_PER_PAGE)
  const pageContacts = contacts.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BigProgressCard
          label="Contactos nuevos"
          icon="📋"
          actual={myActuals.contacts}
          goal={myGoal?.goal_contacts}
        />
        <BigProgressCard
          label="Ventas cerradas"
          icon="✅"
          actual={myActuals.sales}
          goal={myGoal?.goal_sales}
        />
      </div>

      {contacts.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Mis contactos del mes — {contacts.length} registro{contacts.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Fecha', 'Cliente', 'Empresa', 'Producto', 'Estado'].map(col => (
                    <th
                      key={col}
                      className="px-4 py-2 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageContacts.map((c, i) => (
                  <tr
                    key={i}
                    className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                  >
                    <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                      {c.fecha_registro
                        ? format(new Date(c.fecha_registro), 'dd/MM/yyyy')
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                      {c.cliente || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                      {c.empresa || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                      {c.producto || '—'}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLORS[c.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                        {c.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 0}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                ← Anterior
              </button>
              <span className="text-xs text-gray-500">{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages - 1}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          <p className="text-sm">No tenés contactos registrados en este mes</p>
        </div>
      )}
    </div>
  )
}

// ── Objetivos page ────────────────────────────────────────────────────────────

export default function Objetivos() {
  const { userName, role } = useAuthStore()
  const isAdmin = role === 'admin'

  const [selectedDate, setSelectedDate] = useState(new Date())
  const month = getMonthStart(selectedDate)

  const [goals,      setGoals]      = useState([])
  const [actuals,    setActuals]    = useState({})
  const [vendedores, setVendedores] = useState([])
  const [contacts,   setContacts]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [goalModal,  setGoalModal]  = useState({ open: false, vendedor: null })

  const today         = new Date()
  const isCurrentMonth = isSameMonth(selectedDate, today)

  function changeMonth(delta) {
    setSelectedDate(prev => addMonths(prev, delta))
  }

  useEffect(() => { loadData() }, [month]) // eslint-disable-line

  async function loadData() {
    setLoading(true)
    try {
      const [goalsData, actualsData, extraData] = await Promise.all([
        getGoalsByMonth(month),
        getActualsByMonth(month),
        isAdmin
          ? getVendedoresList()
          : getContactsByVendedorMonth(userName, month),
      ])
      setGoals(goalsData)
      setActuals(actualsData)
      if (isAdmin) setVendedores(extraData)
      else setContacts(extraData)
    } catch (err) {
      toast.error('Error al cargar objetivos: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const goalsMap = useMemo(() => {
    const m = {}
    goals.forEach(g => { m[g.vendedor] = g })
    return m
  }, [goals])

  const allVendors = useMemo(() => {
    if (!isAdmin) return []
    const set = new Set([...vendedores, ...Object.keys(actuals)])
    return [...set].sort()
  }, [vendedores, actuals, isAdmin])

  const teamTotals = useMemo(() => {
    const tot = { contacts: 0, sales: 0, goalContacts: 0, goalSales: 0 }
    Object.values(actuals).forEach(a => { tot.contacts += a.contacts; tot.sales += a.sales })
    goals.forEach(g => { tot.goalContacts += g.goal_contacts || 0; tot.goalSales += g.goal_sales || 0 })
    return tot
  }, [actuals, goals])

  const myGoal    = goalsMap[userName]
  const myActuals = actuals[userName] ?? { contacts: 0, sales: 0 }

  const modalVendedores = goalModal.vendedor ? [goalModal.vendedor] : allVendors

  const monthLabel = format(selectedDate, 'MMMM yyyy', { locale: es })

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Objetivos de Ventas"
        subtitle="Seguimiento mensual del equipo"
        action={
          <div className="flex items-center gap-3 flex-wrap">
            {/* Selector de mes */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => changeMonth(-1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-base font-semibold text-gray-700 min-w-[150px] text-center capitalize">
                {monthLabel}
              </span>
              <button
                onClick={() => changeMonth(1)}
                disabled={isCurrentMonth}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-600"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {isAdmin && (
              <Button
                size="sm"
                onClick={() => setGoalModal({ open: true, vendedor: null })}
              >
                Definir objetivos
              </Button>
            )}
          </div>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : isAdmin ? (
        <AdminView
          vendors={allVendors}
          goalsMap={goalsMap}
          actuals={actuals}
          teamTotals={teamTotals}
          onEdit={v => setGoalModal({ open: true, vendedor: v })}
          onDefine={v => setGoalModal({ open: true, vendedor: v })}
        />
      ) : (
        <VendorView
          myGoal={myGoal}
          myActuals={myActuals}
          contacts={contacts}
        />
      )}

      {goalModal.open && (
        <GoalModal
          open={true}
          onClose={() => setGoalModal({ open: false, vendedor: null })}
          month={month}
          vendedores={modalVendedores}
          goalsMap={goalsMap}
          onSaved={loadData}
        />
      )}
    </div>
  )
}
