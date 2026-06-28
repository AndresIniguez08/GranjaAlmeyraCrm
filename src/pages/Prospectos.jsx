import { useState, useEffect, useCallback, useMemo } from 'react'
import { Target, Plus, LayoutGrid, List } from 'lucide-react'
import toast from 'react-hot-toast'
import useProspectStore from '@/store/prospectStore'
import useAuthStore from '@/store/authStore'
import * as prospectService from '@/services/prospectService'
import { ProspectGrid }      from '@/features/prospects/ProspectGrid'
import { ProspectList }      from '@/features/prospects/ProspectList'
import { ProspectModal }     from '@/features/prospects/ProspectModal'
import { AttemptModal }      from '@/features/prospects/AttemptModal'
import { AttemptEditModal }  from '@/features/prospects/AttemptEditModal'
import { FollowupModal }          from '@/features/followups/FollowupModal'
import { ConvertToClientModal }   from '@/features/clients/ConvertToClientModal'
import { LoadingSpinner }         from '@/components/shared/LoadingSpinner'

const TABS = [
  { id: 'grid', label: 'Grilla de seguimiento', icon: LayoutGrid },
  { id: 'list', label: 'Lista de prospectos',   icon: List       },
]

export default function Prospectos() {
  const [tab, setTab] = useState('grid')

  // ── Store ───────────────────────────────────────────────────────────────────
  const {
    prospects,
    loading,
    fetchProspects,
    addProspect,
    updateProspect: storeUpdate,
    removeProspect,
    addAttempt: storeAddAttempt,
    updateAttempt: storeUpdateAttempt,
    removeAttempt: storeRemoveAttempt,
  } = useProspectStore()

  const { userName } = useAuthStore()

  // ── Estado "Sin vender" ─────────────────────────────────────────────────────
  const [noVendidos, setNoVendidos] = useState([])
  const [noVendidosLoading, setNoVendidosLoading] = useState(false)

  const fetchNoVendidos = useCallback(async () => {
    setNoVendidosLoading(true)
    try {
      const data = await prospectService.getNoVendidosWithFollowups()
      setNoVendidos(data)
    } catch (err) {
      toast.error('Error al cargar contactos No Vendidos: ' + err.message)
    } finally {
      setNoVendidosLoading(false)
    }
  }, [])

  // ── Filtros ─────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [filterVendedor, setFilterVendedor] = useState('')
  const [filterResult, setFilterResult] = useState('')

  const vendedores = useMemo(() =>
    [...new Set(prospects.map((p) => p.assigned_to).filter(Boolean))].sort(),
    [prospects]
  )

  const filteredNoVendidos = useMemo(() => {
    const s = search.toLowerCase()
    return noVendidos.filter((c) => {
      const matchSearch = !s ||
        String(c.cliente || c.name || '').toLowerCase().includes(s) ||
        String(c.empresa || c.business || '').toLowerCase().includes(s)
      const matchResult = !filterResult || (
        filterResult === 'sin_intentos'
          ? !c.attempts?.length
          : c.attempts?.length > 0 && c.attempts[c.attempts.length - 1].result === filterResult
      )
      return matchSearch && matchResult
    })
  }, [noVendidos, search, filterResult])

  const filteredProspects = useMemo(() => {
    const s = search.toLowerCase()
    return prospects.filter((p) => {
      const matchSearch = !s ||
        String(p.name || '').toLowerCase().includes(s) ||
        String(p.business || '').toLowerCase().includes(s)
      const matchVendedor = !filterVendedor || p.assigned_to === filterVendedor
      const matchResult = !filterResult || (
        filterResult === 'sin_intentos'
          ? !p.attempts?.length
          : p.attempts?.length > 0 && p.attempts[p.attempts.length - 1].result === filterResult
      )
      return matchSearch && matchVendedor && matchResult
    })
  }, [prospects, search, filterVendedor, filterResult])

  const hasFilter = search || filterVendedor || filterResult

  // ── Modales ─────────────────────────────────────────────────────────────────
  const [prospectModal, setProspectModal] = useState({ open: false, prospect: null })
  const [attemptModal,  setAttemptModal]  = useState({ open: false, prospect: null })
  const [editModal,     setEditModal]     = useState({ open: false, prospect: null, attempt: null })
  const [followupContact, setFollowupContact] = useState(null)
  const [convertProspect, setConvertProspect] = useState(null)
  const [saving, setSaving] = useState(false)

  // ── Fetch inicial ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetchProspects().catch(() => toast.error('Error al cargar prospectos'))
    fetchNoVendidos()
  }, []) // eslint-disable-line

  // ── CRUD Prospectos ─────────────────────────────────────────────────────────
  const handleSaveProspect = useCallback(async (data) => {
    setSaving(true)
    try {
      const isEdit = Boolean(prospectModal.prospect)
      if (isEdit) {
        const updated = await prospectService.updateProspect(prospectModal.prospect.id, data)
        storeUpdate(prospectModal.prospect.id, updated)
        toast.success('Prospecto actualizado')
      } else {
        const created = await prospectService.createProspect({
          ...data,
          created_by: userName,
        })
        addProspect(created)
        toast.success('Prospecto creado')
      }
      setProspectModal({ open: false, prospect: null })
    } catch (err) {
      toast.error(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }, [prospectModal.prospect, userName, storeUpdate, addProspect])

  const handleDeleteProspect = useCallback(async (id) => {
    setSaving(true)
    try {
      await prospectService.deleteProspect(id)
      removeProspect(id)
      toast.success('Prospecto eliminado')
    } catch (err) {
      toast.error(err.message || 'Error al eliminar')
    } finally {
      setSaving(false)
    }
  }, [removeProspect])

  // ── CRUD Intentos (prospectos propios) ──────────────────────────────────────
  const handleSaveAttempt = useCallback(async (data) => {
    setSaving(true)
    try {
      const attempt = await prospectService.addAttempt(data)
      storeAddAttempt(data.prospect_id, attempt)
      toast.success('Intento registrado')
      setAttemptModal({ open: false, prospect: null })
    } catch (err) {
      toast.error(err.message || 'Error al guardar intento')
    } finally {
      setSaving(false)
    }
  }, [storeAddAttempt])

  const handleUpdateAttempt = useCallback(async (attemptId, data) => {
    if (!editModal.prospect) return
    setSaving(true)
    try {
      const updated = await prospectService.updateAttempt(attemptId, data)
      storeUpdateAttempt(editModal.prospect.id, attemptId, updated)
      toast.success('Intento actualizado')
      setEditModal({ open: false, prospect: null, attempt: null })
    } catch (err) {
      toast.error(err.message || 'Error al actualizar')
    } finally {
      setSaving(false)
    }
  }, [editModal.prospect, storeUpdateAttempt])

  const handleDeleteAttempt = useCallback(async (attemptId) => {
    if (!editModal.prospect) return
    setSaving(true)
    try {
      await prospectService.deleteAttempt(attemptId)
      storeRemoveAttempt(editModal.prospect.id, attemptId)
      toast.success('Intento eliminado')
      setEditModal({ open: false, prospect: null, attempt: null })
    } catch (err) {
      toast.error(err.message || 'Error al eliminar')
    } finally {
      setSaving(false)
    }
  }, [editModal.prospect, storeRemoveAttempt])

  // ── Handlers de UI ──────────────────────────────────────────────────────────
  const openAddAttempt   = (prospect) => setAttemptModal({ open: true, prospect })
  const openEditAttempt  = (prospect, attempt) => setEditModal({ open: true, prospect, attempt })
  const openEditProspect = (prospect) => setProspectModal({ open: true, prospect })

  // Seguimiento para contacto "Sin vender"
  const openAddFollowup  = (contact) => setFollowupContact(contact)
  const closeFollowup    = () => {
    setFollowupContact(null)
    // Refrescar lista de no vendidos para reflejar el nuevo seguimiento
    fetchNoVendidos()
  }

  const isLoading = loading || noVendidosLoading

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-100 bg-white flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
            <Target size={18} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Prospectos</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {noVendidos.length} sin vender · {prospects.length} prospecto{prospects.length !== 1 ? 's' : ''} propio{prospects.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={() => setProspectModal({ open: true, prospect: null })}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400 hover:bg-amber-500 text-sm font-semibold text-gray-900 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Nuevo prospecto
        </button>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-3 bg-white border-b border-gray-100">
        <div className="flex gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all border-b-2 ${
                tab === id
                  ? 'text-amber-600 border-amber-500 bg-amber-50/60'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filtros ─────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Buscar por nombre o empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent min-w-[200px] flex-1"
            />
            <select
              value={filterVendedor}
              onChange={(e) => setFilterVendedor(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400"
            >
              <option value="">Todos los vendedores</option>
              {vendedores.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <select
              value={filterResult}
              onChange={(e) => setFilterResult(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400"
            >
              <option value="">Todos los estados</option>
              <option value="positivo">✅ Positivo</option>
              <option value="en_proceso">🟡 En proceso</option>
              <option value="negativo">❌ Negativo</option>
              <option value="sin_respuesta">🔵 Sin respuesta</option>
              <option value="sin_intentos">⬜ Sin intentos</option>
            </select>
            {hasFilter && (
              <button
                onClick={() => { setSearch(''); setFilterVendedor(''); setFilterResult('') }}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Contenido ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto px-6 pb-5">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : tab === 'grid' ? (
          <ProspectGrid
            contacts={filteredNoVendidos}
            prospects={filteredProspects}
            totalContactsCount={hasFilter ? noVendidos.length : undefined}
            totalProspectsCount={hasFilter ? prospects.length : undefined}
            onAddFollowup={openAddFollowup}
            onAddAttempt={openAddAttempt}
            onEditAttempt={openEditAttempt}
            onRefresh={() => { fetchProspects().catch(() => {}); fetchNoVendidos(); }}
            onConvert={setConvertProspect}
          />
        ) : (
          <ProspectList
            prospects={filteredProspects}
            totalCount={hasFilter ? prospects.length : undefined}
            onEdit={openEditProspect}
            onDelete={handleDeleteProspect}
            onConvert={setConvertProspect}
            loading={saving}
          />
        )}
      </div>

      {/* ── Modales ─────────────────────────────────────────────────────────── */}
      <ProspectModal
        open={prospectModal.open}
        onClose={() => setProspectModal({ open: false, prospect: null })}
        prospect={prospectModal.prospect}
        onSave={handleSaveProspect}
        loading={saving}
      />

      <AttemptModal
        open={attemptModal.open}
        onClose={() => setAttemptModal({ open: false, prospect: null })}
        prospect={attemptModal.prospect}
        onSave={handleSaveAttempt}
        loading={saving}
      />

      <AttemptEditModal
        open={editModal.open}
        onClose={() => setEditModal({ open: false, prospect: null, attempt: null })}
        prospect={editModal.prospect}
        attempt={editModal.attempt}
        onSave={handleUpdateAttempt}
        onDelete={handleDeleteAttempt}
        loading={saving}
      />

      {/* Modal: agendar seguimiento para contacto "Sin vender" */}
      {followupContact && (
        <FollowupModal
          open={true}
          contact={followupContact}
          onClose={closeFollowup}
        />
      )}

      {/* Modal: convertir prospecto propio a cliente */}
      {convertProspect && (
        <ConvertToClientModal
          open={true}
          source={{ ...convertProspect, _sourceType: 'prospect' }}
          onClose={() => setConvertProspect(null)}
          onSuccess={() => {
            setConvertProspect(null)
            fetchProspects().catch(() => {})
          }}
        />
      )}
    </div>
  )
}
