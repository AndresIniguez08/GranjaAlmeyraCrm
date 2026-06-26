import { startOfDay, isBefore, isEqual, parseISO, addDays } from 'date-fns'

export function getUrgency(scheduledDate) {
  if (!scheduledDate) return 'futuro'
  const today = startOfDay(new Date())
  const date  = startOfDay(parseISO(scheduledDate))
  if (isBefore(date, today)) return 'vencido'
  if (isEqual(date, today))  return 'hoy'
  return 'futuro'
}

export function getUrgencyLabel(urgency) {
  return { vencido: 'Vencido', hoy: 'Hoy', futuro: 'Próximo' }[urgency] ?? urgency
}

export function isWithinNext7Days(scheduledDate) {
  if (!scheduledDate) return false
  const today    = startOfDay(new Date())
  const in7Days  = addDays(today, 7)
  const date     = startOfDay(parseISO(scheduledDate))
  return !isBefore(date, addDays(today, 1)) && !isBefore(in7Days, date)
}

export function countByUrgency(followups) {
  const vencidos = followups.filter(f => getUrgency(f.scheduled_date) === 'vencido').length
  const hoy      = followups.filter(f => getUrgency(f.scheduled_date) === 'hoy').length
  const proximos = followups.filter(f => isWithinNext7Days(f.scheduled_date)).length
  return { vencidos, hoy, proximos }
}
