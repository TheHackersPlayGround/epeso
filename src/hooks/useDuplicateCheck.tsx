import { useRef, useState, type ReactNode } from 'react'
import DuplicateWarningModal from '../components/DuplicateWarningModal'
import { checkDuplicate, type DuplicateMatch, type DuplicatePerson, type DuplicateProgram } from '../services/duplicateService'

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase()
const samePerson = (a: DuplicatePerson, b: DuplicatePerson) =>
  norm(a.firstName) === norm(b.firstName) && norm(a.lastName) === norm(b.lastName) && a.birthdate === b.birthdate

// Asks the backend whether this person is already in the program, and shows the warning if so.
// `confirmNew` resolves true when the save should go ahead (no match, or the user chose "Save anyway").
// When editing, pass the saved record's id and its saved name/birthdate: nothing is checked unless
// the name or birthdate was actually changed.
export function useDuplicateCheck(program: DuplicateProgram) {
  const [checking, setChecking] = useState(false)
  const [matches, setMatches] = useState<DuplicateMatch[] | null>(null)
  const resolver = useRef<((proceed: boolean) => void) | null>(null)

  const confirmNew = async (
    person: DuplicatePerson,
    edit?: { id: number; saved: DuplicatePerson },
  ): Promise<boolean> => {
    if (edit && samePerson(person, edit.saved)) return true
    setChecking(true)
    const found = await checkDuplicate(program, person, edit?.id)
    setChecking(false)
    if (found.length === 0) return true
    return new Promise<boolean>(resolve => {
      resolver.current = resolve
      setMatches(found)
    })
  }

  // Convenience for the Add/Edit forms. Adding checks the new person; editing checks only when the name or
  // birthdate was changed (and only if the saved record's id is known, so it never flags itself).
  const confirmSave = (
    mode: 'add' | 'edit' | 'view' | undefined,
    person: DuplicatePerson,
    saved?: { firstName?: string; lastName?: string; birthdate?: string; id?: number },
  ): Promise<boolean> => {
    if (mode !== 'edit') return confirmNew(person)
    if (!saved || typeof saved.id !== 'number') return Promise.resolve(true)
    return confirmNew(person, {
      id: saved.id,
      saved: { firstName: saved.firstName ?? '', lastName: saved.lastName ?? '', birthdate: saved.birthdate ?? '' },
    })
  }

  const answer = (proceed: boolean) => {
    setMatches(null)
    resolver.current?.(proceed)
    resolver.current = null
  }

  const modal: ReactNode = matches && (
    <DuplicateWarningModal matches={matches} onGoBack={() => answer(false)} onSaveAnyway={() => answer(true)} />
  )

  return { checking, confirmNew, confirmSave, modal }
}
