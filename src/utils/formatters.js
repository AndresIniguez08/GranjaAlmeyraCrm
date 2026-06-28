import { format, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'
import { ACTION_TYPES } from './constants'

/**
 * Formatea una fecha ISO o date string a "dd/MM/yyyy"
 */
export function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    if (!isValid(d)) return dateStr
    return format(d, 'dd/MM/yyyy', { locale: es })
  } catch {
    return dateStr
  }
}

/**
 * Formatea timestamp a "dd/MM/yyyy HH:mm"
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    if (!isValid(d)) return dateStr
    return format(d, "dd/MM/yyyy HH:mm", { locale: es })
  } catch {
    return dateStr
  }
}

/**
 * Retorna clave "YYYY-MM" de una fecha para agrupar por mes
 */
export function monthKey(dateStr) {
  if (!dateStr) return ''
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    if (!isValid(d)) return ''
    return format(d, 'yyyy-MM')
  } catch {
    return ''
  }
}

/**
 * Formatea "YYYY-MM" a "Ene 2024" para mostrar en gráficos
 */
export function formatMonth(key) {
  if (!key) return ''
  try {
    const d = parseISO(key + '-01')
    return format(d, 'MMM yyyy', { locale: es })
  } catch {
    return key
  }
}

/**
 * Limpia un número de teléfono para WhatsApp (formato Argentina)
 */
export function cleanPhoneForWhatsApp(phone) {
  if (!phone) return null
  const cleaned = phone.replace(/\D/g, '')
  if (!cleaned) return null
  return cleaned.startsWith('54') ? cleaned : `54${cleaned}`
}

/**
 * Trunca texto largo
 */
export function truncate(str, max = 40) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}

/**
 * Devuelve la entrada de ACTION_TYPES para un action_type dado.
 * Si no existe, retorna un fallback con el valor crudo.
 */
export function getActionType(value) {
  return (
    ACTION_TYPES.find(a => a.value === value) ?? {
      value,
      label: value ?? '—',
      icon:  'Edit3',
      color: '#6B7280',
    }
  )
}
