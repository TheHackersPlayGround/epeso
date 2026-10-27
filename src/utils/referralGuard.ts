import { useCallback, useRef, useState } from 'react'
import { checkDuplicateReferral } from '../services/referralService'

// Bundles the duplicate-referral check with its confirm modal (ConfirmModal needs
// to be rendered in the tree): call confirmReferralOk() and render {modal} once.
export function useReferralGuard() {
  const [state, setState] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const resolveRef = useRef<((ok: boolean) => void) | null>(null)

  const settle = (ok: boolean) => {
    setState({ open: false, message: '' })
    resolveRef.current?.(ok)
    resolveRef.current = null
  }

  // True if it's OK to create the referral -- no duplicate, or user confirmed.
  // Fails open: an error in the check never blocks the referral.
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
