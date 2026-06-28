import { supabase } from './supabase'
import { format, endOfMonth, parseISO } from 'date-fns'

export async function getGoalsByMonth(month) {
  const { data, error } = await supabase
    .from('sales_goals')
    .select('*')
    .eq('month', month)
  if (error) throw error
  return data ?? []
}

export async function upsertGoal({ vendedor, month, goal_contacts, goal_sales, created_by }) {
  const { data, error } = await supabase
    .from('sales_goals')
    .upsert(
      { vendedor, month, goal_contacts, goal_sales, created_by },
      { onConflict: 'vendedor,month' }
    )
    .select()
  if (error) throw error
  return data
}

export async function getActualsByMonth(month) {
  const endDate = format(endOfMonth(parseISO(month)), 'yyyy-MM-dd')

  const { data, error } = await supabase
    .from('commercial_contacts')
    .select('vendedor, estado')
    .gte('fecha_registro', month)
    .lte('fecha_registro', endDate + 'T23:59:59')

  if (error) throw error

  const actuals = {}
  ;(data ?? []).forEach(c => {
    if (!c.vendedor) return
    if (!actuals[c.vendedor]) actuals[c.vendedor] = { contacts: 0, sales: 0 }
    actuals[c.vendedor].contacts++
    if (c.estado === 'Vendido') actuals[c.vendedor].sales++
  })
  return actuals
}

export async function getVendedoresList() {
  const { data, error } = await supabase
    .from('commercial_contacts')
    .select('vendedor')
    .not('vendedor', 'is', null)
    .neq('vendedor', '')
  if (error) throw error
  const set = new Set((data ?? []).map(d => d.vendedor))
  return [...set].sort()
}

export async function getContactsByVendedorMonth(vendedor, month) {
  const endDate = format(endOfMonth(parseISO(month)), 'yyyy-MM-dd')
  const { data, error } = await supabase
    .from('commercial_contacts')
    .select('fecha_registro, cliente, empresa, producto, estado')
    .eq('vendedor', vendedor)
    .gte('fecha_registro', month)
    .lte('fecha_registro', endDate + 'T23:59:59')
    .order('fecha_registro', { ascending: false })
  if (error) throw error
  return data ?? []
}
