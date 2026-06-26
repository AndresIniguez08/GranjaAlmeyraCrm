import { formatDate } from './formatters'

function downloadCsv(rows, filename) {
  const csv = '﻿' + rows.map(cols =>
    cols.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function downloadText(content, filename) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportContacts(contacts) {
  const header = [
    'Fecha', 'Vendedor', 'Cliente', 'Empresa', 'Teléfono',
    'Email', 'Producto', 'Estado', 'Derivado a', 'Motivo', 'Nota'
  ]
  const rows = contacts.map(c => [
    formatDate(c.fecha),
    c.vendedor || '',
    c.cliente || '',
    c.empresa || '',
    c.telefono || '',
    c.email || '',
    c.producto || '',
    c.estado || '',
    c.cliente_derivado || '',
    c.motivo || '',
    c.note || '',
  ])
  downloadCsv([header, ...rows], `contactos_${new Date().toISOString().slice(0,10)}.csv`)
}

export function exportClients(clients, contacts = []) {
  const header = [
    'Nombre', 'Empresa', 'Teléfono', 'Email', 'Dirección',
    'Tipo', 'Estado', 'Notas', 'Derivaciones Recibidas', 'Registrado'
  ]
  const rows = clients.map(c => {
    const derivCount = contacts.filter(x => x.cliente_derivado === c.company).length
    return [
      c.name || '',
      c.company || '',
      c.phone || '',
      c.email || '',
      c.address || '',
      c.type || '',
      c.status || '',
      c.notes || '',
      derivCount,
      formatDate(c.registered_at),
    ]
  })
  downloadCsv([header, ...rows], `clientes_${new Date().toISOString().slice(0,10)}.csv`)
}

export function exportFullReport(contacts, clients) {
  const today = new Date().toISOString().slice(0, 10)
  const totalSales = contacts.filter(c => c.estado === 'Vendido').length
  const totalDerived = contacts.filter(c => c.estado === 'Derivado').length
  const totalNoSold = contacts.filter(c => c.estado === 'No Vendido').length
  const activeClients = clients.filter(c => c.status === 'Activo').length
  const convRate = contacts.length
    ? Math.round((totalSales / contacts.length) * 100)
    : 0

  const derivCounts = {}
  contacts
    .filter(c => c.estado === 'Derivado' && c.cliente_derivado)
    .forEach(c => { derivCounts[c.cliente_derivado] = (derivCounts[c.cliente_derivado] || 0) + 1 })

  const topDeriv = Object.entries(derivCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  let report = `INFORME COMERCIAL COMPLETO — ${today}\n`
  report += '='.repeat(50) + '\n\n'
  report += `RESUMEN GENERAL:\n`
  report += `  Total contactos:    ${contacts.length}\n`
  report += `  Vendidos:           ${totalSales} (${convRate}% tasa de conversión)\n`
  report += `  Derivados:          ${totalDerived}\n`
  report += `  No vendidos:        ${totalNoSold}\n`
  report += `  Clientes totales:   ${clients.length}\n`
  report += `  Clientes activos:   ${activeClients}\n\n`
  report += `TOP CLIENTES POR DERIVACIONES:\n`
  topDeriv.forEach(([name, count], i) => {
    report += `  ${i + 1}. ${name}: ${count} derivaciones\n`
  })

  downloadText(report, `informe_${today}.txt`)
}
