// Possible-duplicate warnings: is this person (same first name, last name and birthdate)
// already recorded in the same program? Only warns -- the user decides whether to go ahead.

import axiosClient from './axiosClient'
import { ENDPOINTS } from '../config/api'

export type DuplicateProgram = 'cdsp' | 'gip' | 'spes' | 'skills' | 'dilp' | 'tupad' | 'slp' | 'clpep' | 'ofw' | 'ef'

export type DuplicateMatch = {
  id: number
  name: string
  birthdate: string
  program: string
  dateApplied: string
  inRecycleBin: boolean
}

export type DuplicatePerson = { firstName: string; lastName: string; birthdate: string }

// People already in the program with the same first name, last name and birthdate. A failed check
// returns no matches, so a network problem never stops staff from saving.
export async function checkDuplicate(
  program: DuplicateProgram,
  person: DuplicatePerson,
  excludeId?: number,
): Promise<DuplicateMatch[]> {
  try {
    const res = await axiosClient.post<{ data: { matches: DuplicateMatch[] } }>(ENDPOINTS.duplicates.check, {
      program, ...person, ...(excludeId ? { excludeId } : {}),
    })
    return res.data.data.matches ?? []
  } catch {
    return []
  }
}

// ─── Excel imports ───────────────────────────────────────────────────────────

export type ImportDuplicateReport = {
  existing: { row: number; name: string; birthdate: string | null; matches: DuplicateMatch[] }[]
  inFile: { row: number; firstRow: number; name: string; birthdate: string | null }[]
}
export type ImportDuplicateChoice = 'skip' | 'import' | 'cancel'

// The dialog that asks the user what to do; registered once by <DuplicateHost /> in App.
type ImportDuplicateHandler = (report: ImportDuplicateReport) => Promise<ImportDuplicateChoice>
let importDuplicateHandler: ImportDuplicateHandler | null = null
export function setImportDuplicateHandler(handler: ImportDuplicateHandler | null) {
  importDuplicateHandler = handler
}

// All-or-nothing batch create with a duplicate step: when the backend finds duplicates it saves nothing,
// the user chooses (skip them / import them anyway / cancel), and the batch is sent again with that choice.
export async function postImportWithDuplicateCheck(
  url: string,
  rows: Record<string, unknown>[],
): Promise<{ ids: number[]; skipped: number }> {
  type Res = { status: string; data: { ids: number[]; count: number; skipped?: number } & Partial<ImportDuplicateReport> }
  let res = await axiosClient.post<Res>(url, { rows })
  if (res.data.status === 'duplicates') {
    const report = res.data.data as unknown as ImportDuplicateReport
    const choice: ImportDuplicateChoice = importDuplicateHandler ? await importDuplicateHandler(report) : 'cancel'
    if (choice === 'cancel') throw new Error('Import cancelled. No records were imported.')
    res = await axiosClient.post<Res>(url, { rows, duplicates: choice })
  }
  return { ids: res.data.data.ids ?? [], skipped: res.data.data.skipped ?? 0 }
}
