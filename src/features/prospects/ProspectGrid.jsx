import { useState, useMemo, useCallback } from 'react'
import { parse, format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Phone, Plus, Target,
  AtSign, MessageCircle, FileText, MapPin, Edit3, Mail,
} from 'lucide-react'
import { PROSPECT_ACTIONS, PROSPECT_RESULTS } from '@/utils/constants'

// ─── Icono dinámico por acción ────────────────────────────────────────────────

const ACTION_ICONS = {
  ig:            AtSign,
  whatsapp:      MessageCircle,
  lista_precios: FileText,
  llamada:       Phone,
  visita:        MapPin,
  otro:          Edit3,
  email:         Mail,
}

function ActionIcon({ action, color, size = 14 }) {
  const Icon = ACTION_ICONS[action]
  if (!Icon) return null
  return <Icon size={size} color={color} />
}

// ─── Parsear date string local (evita UTC offset) ────────────────────────────

function parseLocalDate(dateStr) {
  return parse(dateStr, 'yyyy-MM-dd', new Date())
}

// ─── Tooltip flotante (fixed, fuera del flujo) ───────────────────────────────

function GridTooltip({ tooltip }) {
  if (!tooltip) return null
  const { attempt, rect } = tooltip
  const actionInfo = PROSPECT_ACTIONS.find((a) => a.value === attempt.action)
  const resultInfo = PROSPECT_RESULTS[attempt.result]

  const top  = rect.top - 8
  const left = rect.left + rect.width / 2

  return (
    <div
      className="fixed z-[60] pointer-events-none"
      style={{ top, left, transform: 'translate(-50%, -100%)' }}
    >
      <div
        className="bg-gray-900 text-white text-xs rounded-xl p-3 shadow-xl"
        style={{ minWidth: 180, maxWidth: 240 }}
      >
        <p className="font-semibold mb-1.5 text-gray-100">
          {format(parseLocalDate(attempt.attempt_date), "d 'de' MMMM yyyy", { locale: es })}
        </p>
        {actionInfo && (
          <div className="flex items-center gap-1.5 mb-1">
            <ActionIcon action={attempt.action} color={actionInfo.color} size={12} />
            <span style={{ color: actionInfo.color }}>{actionInfo.label}</span>
          </div>
        )}
        {!actionInfo && attempt.action && (
          <div className="flex items-center gap-1.5 mb-1">
            <ActionIcon action={attempt.action} color="#6B7280" size={12} />
            <span className="text-gray-400 capitalize">{attempt.action}</span>
          </div>
        )}
        {resultInfo && (
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: resultInfo.color }}
            />
            <span>{resultInfo.label}</span>
          </div>
        )}
        {attempt.action_note && (
          <p className="text-gray-400 mt-1.5 leading-snug border-t border-gray-700 pt-1.5">
            {attempt.action_note}
          </p>
        )}
        {attempt.created_by && (
          <p className="text-gray-500 text-[10px] mt-1">por {attempt.created_by}</p>
        )}
      </div>
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full"
        style={{
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid #111827',
        }}
      />
    </div>
  )
}

// ─── Celda con intento ────────────────────────────────────────────────────────

function AttemptCell({ attempt, onClick, onMouseEnter, onMouseLeave }) {
  const resultInfo = PROSPECT_RESULTS[attempt.result] || {}
  const actionInfo = PROSPECT_ACTIONS.find((a) => a.value === attempt.action)

  return (
    <td
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`border-r border-gray-100 select-none ${onClick ? 'cursor-pointer' : ''}`}
      style={{
        backgroundColor: resultInfo.bg || '#F9FAFB',
        borderLeft: `3px solid ${resultInfo.color || '#E5E7EB'}`,
        width: 120,
        minWidth: 120,
        height: 64,
      }}
    >
      <div className="flex flex-col items-center justify-center h-full gap-1 px-1">
        {actionInfo && (
          <ActionIcon action={attempt.action} color={actionInfo.color} size={15} />
        )}
        {!actionInfo && attempt.action && (
          <ActionIcon action={attempt.action} color="#6B7280" size={15} />
        )}
        <span
          className="text-[10px] font-semibold leading-tight text-center"
          style={{ color: resultInfo.text }}
        >
          {resultInfo.label}
        </span>
      </div>
    </td>
  )
}

// ─── Celda vacía ──────────────────────────────────────────────────────────────

function EmptyCell() {
  return (
    <td
      className="border-r border-gray-100"
      style={{ backgroundColor: '#F9FAFB', width: 120, minWidth: 120, height: 64 }}
    />
  )
}

// ─── Separador de sección ─────────────────────────────────────────────────────

function SectionSeparator({ title, count, colSpan }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="bg-gray-100 px-4 py-2 border-y border-gray-200"
        style={{ position: 'sticky', left: 0, zIndex: 15 }}
      >
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {title} — {count}
        </span>
      </td>
    </tr>
  )
}

// ─── Fila de item (contact o prospect) ────────────────────────────────────────

function ItemRow({ item, allDates, onAddClick, onCellClick, onMouseEnter, onMouseLeave, idx, isContact }) {
  const rowBg = idx % 2 === 0 ? '#ffffff' : '#fafafa'

  const getAttempt = useCallback((date) => {
    if (!item.attempts?.length) return null
    const matches = item.attempts.filter((a) => a.attempt_date === date)
    return matches.length ? matches[matches.length - 1] : null
  }, [item.attempts])

  return (
    <tr>
      {/* Celda info — sticky left */}
      <td
        className="border-r border-gray-200 px-4 py-3"
        style={{
          position: 'sticky',
          left: 0,
          zIndex: 10,
          backgroundColor: rowBg,
          width: 200,
          minWidth: 200,
          height: 64,
        }}
      >
        <p className="font-semibold text-sm text-gray-900 leading-tight truncate">
          {item.name}
        </p>
        {item.business && (
          <p className="text-[11px] text-gray-500 mt-0.5 truncate">{item.business}</p>
        )}
        {item.phone && (
          <div className="flex items-center gap-1 mt-1">
            <Phone size={9} className="text-gray-400 shrink-0" />
            <span className="text-[11px] text-gray-500 truncate">{item.phone}</span>
          </div>
        )}
        {!isContact && item.instagram && (
          <p className="text-[11px] text-pink-500 mt-0.5 truncate">
            @{item.instagram.replace(/^@/, '')}
          </p>
        )}
      </td>

      {/* Celdas de intentos */}
      {allDates.map((date) => {
        const attempt = getAttempt(date)
        if (!attempt) return <EmptyCell key={date} />
        return (
          <AttemptCell
            key={date}
            attempt={attempt}
            onClick={isContact ? undefined : () => onCellClick(item, attempt)}
            onMouseEnter={(e) => onMouseEnter(e, attempt)}
            onMouseLeave={onMouseLeave}
          />
        )
      })}

      {/* Celda + — sticky right */}
      <td
        className="border-l border-gray-200"
        style={{
          position: 'sticky',
          right: 0,
          zIndex: 10,
          backgroundColor: rowBg,
          width: 60,
          minWidth: 60,
          height: 64,
          textAlign: 'center',
        }}
      >
        <button
          onClick={() => onAddClick(item)}
          className="w-7 h-7 rounded-full bg-amber-400 hover:bg-amber-500 text-white flex items-center justify-center mx-auto transition-colors shadow-sm"
          title={`${isContact ? 'Registrar seguimiento' : 'Registrar intento'} para ${item.name}`}
        >
          <Plus size={14} />
        </button>
      </td>
    </tr>
  )
}

// ─── ProspectGrid ─────────────────────────────────────────────────────────────

export function ProspectGrid({ contacts = [], prospects = [], onAddFollowup, onAddAttempt, onEditAttempt }) {
  const [tooltip, setTooltip] = useState(null)

  const allDates = useMemo(() => {
    const set = new Set()
    contacts.forEach((c) => c.attempts?.forEach((a) => set.add(a.attempt_date)))
    prospects.forEach((p) => p.attempts?.forEach((a) => set.add(a.attempt_date)))
    return Array.from(set).sort()
  }, [contacts, prospects])

  const handleMouseEnter = useCallback((e, attempt) => {
    setTooltip({ attempt, rect: e.currentTarget.getBoundingClientRect() })
  }, [])

  const handleMouseLeave = useCallback(() => setTooltip(null), [])

  const isEmpty = contacts.length === 0 && prospects.length === 0

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
        <Target size={40} className="text-gray-300" />
        <p className="text-sm font-medium">No hay datos todavía</p>
        <p className="text-xs">Los contactos No Vendidos y prospectos propios aparecerán aquí</p>
      </div>
    )
  }

  const hasAttempts = allDates.length > 0
  const totalCols = 1 + allDates.length + 1

  return (
    <div className="relative">
      <div
        className="overflow-auto border border-gray-200 rounded-xl"
        style={{ maxHeight: 'calc(100vh - 280px)' }}
      >
        <table
          className="border-collapse"
          style={{ tableLayout: 'fixed', minWidth: hasAttempts ? 200 + allDates.length * 120 + 60 : 260 }}
        >
          {/* ── THEAD ─────────────────────────────────────────────────────────── */}
          <thead>
            <tr className="border-b border-gray-200">
              <th
                className="border-r border-gray-200 px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider"
                style={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 20,
                  backgroundColor: '#F9FAFB',
                  width: 200,
                  minWidth: 200,
                }}
              >
                Prospecto
              </th>

              {allDates.map((date) => (
                <th
                  key={date}
                  className="px-2 py-3 text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider border-r border-gray-100"
                  style={{ width: 120, minWidth: 120 }}
                >
                  {format(parseLocalDate(date), 'dd MMM', { locale: es })}
                </th>
              ))}

              <th
                className="px-2 py-3 text-center text-[13px] font-bold text-amber-500 border-l border-gray-200"
                style={{
                  position: 'sticky',
                  right: 0,
                  zIndex: 20,
                  backgroundColor: '#F9FAFB',
                  width: 60,
                  minWidth: 60,
                }}
              >
                +
              </th>
            </tr>
          </thead>

          {/* ── TBODY ─────────────────────────────────────────────────────────── */}
          <tbody>
            {/* Sección A: Sin vender */}
            <SectionSeparator
              title="📋 Sin vender"
              count={`${contacts.length} contacto${contacts.length !== 1 ? 's' : ''}`}
              colSpan={totalCols}
            />
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={totalCols} className="px-6 py-4 text-sm text-gray-400 text-center bg-white">
                  No hay contactos No Vendidos
                </td>
              </tr>
            ) : (
              contacts.map((contact, idx) => (
                <ItemRow
                  key={contact.id}
                  item={contact}
                  allDates={allDates}
                  onAddClick={onAddFollowup}
                  onCellClick={() => {}}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  idx={idx}
                  isContact={true}
                />
              ))
            )}

            {/* Sección B: Prospectos propios */}
            <SectionSeparator
              title="🎯 Prospectos propios"
              count={`${prospects.length} prospecto${prospects.length !== 1 ? 's' : ''}`}
              colSpan={totalCols}
            />
            {prospects.length === 0 ? (
              <tr>
                <td colSpan={totalCols} className="px-6 py-4 text-sm text-gray-400 text-center bg-white">
                  No hay prospectos propios. Usá el botón "Nuevo prospecto" para agregar el primero.
                </td>
              </tr>
            ) : (
              prospects.map((prospect, idx) => (
                <ItemRow
                  key={prospect.id}
                  item={prospect}
                  allDates={allDates}
                  onAddClick={onAddAttempt}
                  onCellClick={onEditAttempt}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  idx={idx}
                  isContact={false}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <GridTooltip tooltip={tooltip} />
    </div>
  )
}
