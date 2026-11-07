import * as XLSX from 'xlsx'
import axiosClient from './axiosClient'
import { ENDPOINTS } from '../config/api'

export function listActivityLogs() {
  return axiosClient.get(ENDPOINTS.activityLogs.list).then(r => r.data)
}

export type ExportLogModule =
  | 'employment' | 'ofw' | 'cdsp' | 'gip' | 'spes' | 'livelihood' | 'skills' | 'documents' | 'security' | 'report'

// Records ONE Activity Log line for an export. Exports are built in the browser, so this is called
// right after the file is produced. It never blocks or fails the export itself.
export function logExport(entry: { module: ExportLogModule; name: string; format: 'Excel' | 'PDF' | 'Word'; rows?: number }) {
  axiosClient.post(ENDPOINTS.activityLogs.logExport, entry).catch(() => { /* logging must not break an export */ })
}

// Same, for a spreadsheet export: counts the data rows (everything below the header rows).
export function logSheetExport(module: ExportLogModule, name: string, ws: XLSX.WorkSheet, headerRows: number) {
  const ref = ws['!ref']
  const rows = ref ? Math.max(0, XLSX.utils.decode_range(ref).e.r + 1 - headerRows) : 0
  logExport({ module, name, format: 'Excel', rows })
}
