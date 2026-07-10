import { useState } from 'react'

// Letters (incl. accented), spaces, hyphens, apostrophes, and periods only —
// for genuine person-name fields (Last/First/Middle Name, Supervisor,
// Coordinator, Facilitator, Contact Person Name, etc). Entity-name fields
// (Batch Name, Company Name, Project Name...) legitimately contain numbers
// and codes, so this is never applied to those.
export const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ'.\-\s]+$/

export type ValidationError = {
  field: string
  message: string
  focus: () => void
}

// Shared required-field validation UX: red border + a red message directly
// under the field, and on Save, scroll to and focus the first invalid field —
// no alert()/Swal popup. One hook so every form in the app behaves identically.
export function useFieldValidation() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const clearFieldError = (field: string) => {
    setFieldErrors(prev => {
      if (!(field in prev)) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const errCls = (field: string) =>
    fieldErrors[field] ? 'border-red-500 ring-2 ring-red-200' : ''

  // Renders as `{fieldMessage('x') && <p className="text-red-500 text-xs mt-1">{fieldMessage('x')}</p>}`
  const fieldMessage = (field: string): string | undefined => fieldErrors[field]

  // Sets fieldErrors (field -> message) from the list and scrolls/focuses the
  // first one. Returns true if there were errors (caller should return early).
  const runValidation = (errors: ValidationError[]): boolean => {
    if (errors.length === 0) {
      setFieldErrors({})
      return false
    }
    const next: Record<string, string> = {}
    for (const e of errors) next[e.field] = e.message
    setFieldErrors(next)
    errors[0].focus()
    return true
  }

  return { fieldErrors, clearFieldError, errCls, fieldMessage, runValidation, setFieldErrors }
}
