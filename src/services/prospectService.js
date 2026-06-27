import { supabase } from './supabase'

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

export async function deleteProspect(id) {
  const { error } = await supabase.from('prospects').delete().eq('id', id)
  if (error) throw error
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
