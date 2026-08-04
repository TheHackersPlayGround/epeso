import { useCallback, useRef, useState } from 'react'
import { checkDuplicateReferral } from '../services/referralService'

// ConfirmModal is a React component, so unlike Swal.fire() it can't be
// triggered from a plain async function — it has to be rendered somewhere in
// the caller's own tree. This hook bundles the duplicate check together with
// the modal it needs: call confirmReferralOk(...) from an event handler (it
// resolves once the user picks an option) and render {modal} once, anywhere
// in the calling component's JSX.
export function useReferralGuard() {
  const [state, setState] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const resolveRef = useRef<((ok: boolean) => void) | null>(null)

  const settle = (ok: boolean) => {
    setState({ open: false, message: '' })
    resolveRef.current?.(ok)
    resolveRef.current = null
  }

  // Returns true if it's OK to create the referral — either there's no
  // duplicate, or the user confirmed the warning. Fails OPEN: if the check
  // errors, it never blocks the referral.
  const confirmReferralOk = useCallback(async (applicantId: number, vacancyId: number, applicantName: string): Promise<boolean> => {
    let dup
    try {
      dup = await checkDuplicateReferral(applicantId, vacancyId)
    } catch {
      return true
    }
    if (!dup.hasDuplicate) return true

    const past = dup.kind === 'placement' ? 'placed at' : 'referred to'
    const message = `${applicantName} was already ${past} ${dup.employer} as ${dup.position} (${dup.outcome}, ${dup.date}).\nRefer again anyway?`
    return new Promise<boolean>(resolve => {
      resolveRef.current = resolve
      setState({ open: true, message })
    })
  }, [])

  return {
    confirmReferralOk,
    referralGuardModal: { isOpen: state.open, message: state.message, onConfirm: () => settle(true), onCancel: () => settle(false) },
  }
}
