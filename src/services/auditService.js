import { supabase } from './supabase'

export async function logDeletion({ entity_type, entity_id, entity_data, performed_by }) {
  const { error } = await supabase
    .from('audit_log')
    .insert({
      action: 'delete',
      entity_type,
      entity_id,
      entity_data,
      performed_by,
    })
  if (error) throw error
}

export async function getAuditLog({ entity_type = null, performed_by = null, limit = 100 } = {}) {
  let query = supabase
    .from('audit_log')
    .select('*')
    .eq('action', 'delete')
    .order('performed_at', { ascending: false })
    .limit(limit)

  if (entity_type) query = query.eq('entity_type', entity_type)
  if (performed_by) query = query.eq('performed_by', performed_by)

  const { data, error } = await query
  if (error) throw error
  return data
}
