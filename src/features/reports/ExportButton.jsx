import toast from 'react-hot-toast'
import { Button } from '@/components/ui'
import { contactService } from '@/services/contactService'
import { clientService } from '@/services/clientService'
import { exportFullReport } from '@/utils/exporters'

export function ExportButton() {
  async function handleExport() {
    const toastId = toast.loading('Generando reporte...')
    try {
      const [contacts, clients] = await Promise.all([
        contactService.getAllForExport({}),
        clientService.getAllForMap(),
      ])
      exportFullReport(contacts, clients)
      toast.success('Reporte exportado exitosamente', { id: toastId })
    } catch (err) {
      toast.error('Error al exportar: ' + err.message, { id: toastId })
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleExport}>
      📄 Exportar Reporte TXT
    </Button>
  )
}
