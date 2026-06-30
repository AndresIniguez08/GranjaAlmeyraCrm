// ─── Contactos ────────────────────────────────────────────────────────────────

export const PRODUCTOS = [
  'B1',
  'B2',
  'B3',
  'Caja 180 B1',
  'Caja 180 B2',
  'Caja 180 B3',
  'Caja 18 Docenas (x6)',
  'Caja 18 Docenas (x12)',
  'Estuche B2 x6 (Licitacion)',
  'Estuche B2 x12 (Licitacion)',
  'Pack 6 Maples B1',
  'Pack 6 Maples B2',
  'Pack 6 Maples B3',
]

export const ESTADOS_CONTACTO = ['Vendido', 'No Vendido', 'Derivado', 'No Viable']

export const NO_VIABLE_REASONS = [
  { value: 'no_responde',   label: 'No responde' },
  { value: 'mejor_precio',  label: 'Consigue mejor precio' },
  { value: 'no_vende_mas',  label: 'Ya no vende / cerró' },
  { value: 'excusas',       label: 'Excusas reiteradas' },
  { value: 'logistica',     label: 'No puede venir a buscar' },
  { value: 'otro',          label: 'Otro motivo' },
]

export const VENDEDORES = [
  'Andrés Iñiguez',
  'Natalia Montero',
  'Juan Larrondo',
  'Eduardo Schiavi',
  'Gabriel Caffarello',
]

// ─── Clientes ─────────────────────────────────────────────────────────────────

export const TIPOS_CLIENTE = [
  'B2B',
  'Distribuidor',
  'Mayorista',
  'Negocio local',
  'Repartidor',
  'Supermercados',
]

export const ESTADOS_CLIENTE = ['Activo', 'Inactivo', 'Prospecto']

// ─── Roles ────────────────────────────────────────────────────────────────────

export const ROLES = {
  ADMIN: 'admin',
  VENDEDOR: 'vendedor',
}

// ─── Colores por tipo de cliente (mapa y badges) ─────────────────────────────

export const TIPO_COLORS = {
  'B2B':          '#3B82F6',
  'Distribuidor': '#10B981',
  'Mayorista':    '#F59E0B',
  'Negocio local':'#EF4444',
  'Repartidor':   '#8B5CF6',
  'Supermercados':'#F97316',
}

export const CHART_COLORS = {
  Vendido:         '#10B981',
  'No Vendido':    '#EF4444',
  Derivado:        '#F59E0B',
  B2B:             '#3B82F6',
  Distribuidor:    '#10B981',
  Mayorista:       '#F59E0B',
  'Negocio local': '#EF4444',
  Repartidor:      '#8B5CF6',
  Supermercados:   '#F97316',
}

// ─── Paginación ───────────────────────────────────────────────────────────────

export const PAGE_SIZE = 20

// ─── Nominatim ────────────────────────────────────────────────────────────────

export const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
export const NOMINATIM_DELAY_MS = 1000

// ─── Dominio Auth ─────────────────────────────────────────────────────────────

export const AUTH_EMAIL_DOMAIN = '@crm.internal'

// ─── Prospectos ───────────────────────────────────────────────────────────────

export const PROSPECT_ACTIONS = [
  { value: 'ig',            label: 'Mandé IG',        icon: 'AtSign',        color: '#E1306C' },
  { value: 'whatsapp',      label: 'WhatsApp',         icon: 'MessageCircle', color: '#25D366' },
  { value: 'lista_precios', label: 'Lista de precios', icon: 'FileText',      color: '#3B82F6' },
  { value: 'llamada',       label: 'Llamé',            icon: 'Phone',         color: '#8B5CF6' },
  { value: 'visita',        label: 'Visita',           icon: 'MapPin',        color: '#F97316' },
  { value: 'otro',          label: 'Otro',             icon: 'Edit3',         color: '#6B7280' },
]

export const PROSPECT_RESULTS = {
  positivo:      { label: 'Positivo',      color: '#10B981', bg: '#D1FAE5', text: '#065F46' },
  en_proceso:    { label: 'En proceso',    color: '#F59E0B', bg: '#FEF3C7', text: '#92400E' },
  negativo:      { label: 'Negativo',      color: '#EF4444', bg: '#FEE2E2', text: '#991B1B' },
  sin_respuesta: { label: 'Sin respuesta', color: '#1E40AF', bg: '#DBEAFE', text: '#1E3A5F' },
}

// ─── Seguimientos ─────────────────────────────────────────────────────────────

export const ACTION_TYPES = [
  { value: 'llamada',       label: 'Llamada',          icon: 'Phone',         color: '#8B5CF6' },
  { value: 'visita',        label: 'Visita',            icon: 'MapPin',        color: '#F97316' },
  { value: 'whatsapp',      label: 'WhatsApp',          icon: 'MessageCircle', color: '#25D366' },
  { value: 'email',         label: 'Email',             icon: 'Mail',          color: '#3B82F6' },
  { value: 'ig',            label: 'Mandé IG',          icon: 'AtSign',        color: '#E1306C' },
  { value: 'lista_precios', label: 'Lista de precios',  icon: 'FileText',      color: '#3B82F6' },
  { value: 'otro',          label: 'Otro',              icon: 'Edit3',         color: '#6B7280' },
]

export const FOLLOWUP_STATUS = {
  PENDIENTE:  'pendiente',
  COMPLETADO: 'completado',
  CANCELADO:  'cancelado',
}

export const URGENCY_COLORS = {
  vencido: 'text-red-600 bg-red-50 border-red-200',
  hoy:     'text-amber-600 bg-amber-50 border-amber-200',
  futuro:  'text-green-600 bg-green-50 border-green-200',
}
