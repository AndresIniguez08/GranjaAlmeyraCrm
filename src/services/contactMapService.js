import { supabase } from './supabase'

const TABLE = 'commercial_contacts'

export async function getContactsForMap() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, cliente, empresa, telefono, producto, estado, vendedor, provincia, localidad, mapa_coords')
    .not('mapa_coords', 'is', null)
    .not('localidad', 'is', null)

  if (error) throw error

  const grouped = {}
  data.forEach(contact => {
    const key = `${contact.localidad}-${contact.provincia}`
    if (!grouped[key]) {
      grouped[key] = {
        localidad: contact.localidad,
        provincia: contact.provincia,
        coordinates: contact.mapa_coords,
        contacts: [],
      }
    }
    grouped[key].contacts.push(contact)
  })

  return Object.values(grouped)
}
