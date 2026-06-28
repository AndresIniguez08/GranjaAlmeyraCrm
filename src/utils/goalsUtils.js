import { format, startOfMonth } from 'date-fns'

export function getProgressColor(percentage) {
  if (percentage >= 100) return 'bg-green-500'
  if (percentage >= 80)  return 'bg-blue-400'
  if (percentage >= 50)  return 'bg-amber-400'
  return 'bg-red-400'
}

export function getProgressMessage(actual, goal) {
  if (!goal) return 'Sin objetivo'
  const pct = Math.round((actual / goal) * 100)
  if (pct >= 100) return `🎉 ¡Objetivo superado! ${actual}/${goal}`
  const remaining = goal - actual
  return `Faltan ${remaining} para llegar al objetivo`
}

export function getMonthStart(date = new Date()) {
  return format(startOfMonth(date), 'yyyy-MM-dd')
}
