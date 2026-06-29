import { supabase } from './supabase'
import { logDeletion } from './auditService'

export async function getNoVendidosWithFollowups() {
  const { data: contacts, error: cErr } = await supabase
    .from('commercial_contacts')
    .select('*')
    .eq('estado', 'No Vendido')
    .order('fecha_registro', { ascending: false })

  if (cErr) throw cErr
  if (!contacts?.length) return []

  const ids = contacts.map(c => c.id)

  const { data: followups, error: fErr } = await supabase
    .from('contact_followups')
    .select('*')
    .in('contact_id', ids)
    .order('scheduled_date', { ascending: true })

  if (fErr) throw fErr

  const followupsMap = {}
  followups?.forEach(f => {
    if (!followupsMap[f.contact_id]) followupsMap[f.contact_id] = []
    followupsMap[f.contact_id].push({
      ...f,
      attempt_date: f.scheduled_date,
      action: f.action_type,
      action_note: f.note,
      result: f.result ?? 'sin_respuesta',
    })
  })

  return contacts.map(c => ({
    ...c,
    _type: 'contact',
    name: c.cliente,
    business: c.empresa,
    phone: c.telefono,
    attempts: followupsMap[c.id] || [],
  }))
}

export async function getProspectsWithAttempts() {
  const { data: prospects, error: pErr } = await supabase
    .from('prospects')
    .select('*')
    .order('created_at', { ascending: false })

  if (pErr) throw pErr

  const { data: attempts, error: aErr } = await supabase
    .from('prospect_attempts')
    .select('*')
    .order('attempt_date', { ascending: true })

  if (aErr) throw aErr

  const attemptsMap = {}
  attempts?.forEach(a => {
    if (!attemptsMap[a.prospect_id]) attemptsMap[a.prospect_id] = []
    attemptsMap[a.prospect_id].push(a)
  })

  return (prospects ?? []).map(p => ({
    ...p,
    attempts: attemptsMap[p.id] || [],
  }))
}

export async function createProspect(data) {
  const { data: result, error } = await supabase
    .from('prospects')
    .insert(data)
    .select('*')
    .single()
  if (error) throw error
  return { ...result, attempts: [] }
}

export async function updateProspect(id, data) {
  const { data: result, error } = await supabase
    .from('prospects')
    .update(data)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return result
}

export async function deleteProspect(id, performedBy) {
  const { data: prospect } = await supabase
    .from('prospects')
    .select('*')
    .eq('id', id)
    .single()

  const { error } = await supabase.from('prospects').delete().eq('id', id)
  if (error) throw error

  await logDeletion({
    entity_type: 'prospect',
    entity_id: id,
    entity_data: prospect,
    performed_by: performedBy,
  })
}

export async function addAttempt({ prospect_id, attempt_date, action, action_note, result, created_by }) {
  const { data, error } = await supabase
    .from('prospect_attempts')
    .insert({ prospect_id, attempt_date, action, action_note, result, created_by })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateAttempt(id, { action, action_note, result }) {
  const { data, error } = await supabase
    .from('prospect_attempts')
    .update({ action, action_note, result })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteAttempt(id) {
  const { error } = await supabase.from('prospect_attempts').delete().eq('id', id)
  if (error) throw error
}
