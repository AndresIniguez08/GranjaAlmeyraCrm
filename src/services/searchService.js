import { supabase } from './supabase'

export async function globalSearch(query) {
  if (!query || query.trim().length < 2) {
    return { contacts: [], clients: [], prospects: [] }
  }

  const q = query.trim()

  const [contactsRes, clientsRes, prospectsRes] = await Promise.all([
    supabase
      .from('commercial_contacts')
      .select('id, cliente, empresa, telefono, producto, estado, vendedor, fecha_registro')
      .or(`cliente.ilike.%${q}%,empresa.ilike.%${q}%,telefono.ilike.%${q}%`)
      .limit(5),

    supabase
      .from('commercial_clients')
      .select('id, name, company, phone, type, status')
      .or(`name.ilike.%${q}%,company.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(5),

    supabase
      .from('prospects')
      .select('id, name, business, phone, instagram')
      .or(`name.ilike.%${q}%,business.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(5),
  ])

  return {
    contacts:  contactsRes.data  ?? [],
    clients:   clientsRes.data   ?? [],
    prospects: prospectsRes.data ?? [],
  }
}
