import Swal from 'sweetalert2'
import { checkDuplicateReferral } from '../services/referralService'

// Returns true if it's OK to create the referral — either there's no duplicate,
// or the user confirmed the warning. Shows a confirmation when the applicant was
// already referred to / placed at the same employer for the same position before.
// Fails OPEN: if the check errors, it never blocks the referral.
export async function confirmReferralOk(applicantId: number, vacancyId: number, applicantName: string): Promise<boolean> {
  let dup
  try {
    dup = await checkDuplicateReferral(applicantId, vacancyId)
  } catch {
    return true
  }
  if (!dup.hasDuplicate) return true

  const past = dup.kind === 'placement' ? 'placed at' : 'referred to'
  const result = await Swal.fire({
    title: 'Possible duplicate referral',
    html: `<b>${applicantName}</b> was already ${past} <b>${dup.employer}</b> as <b>${dup.position}</b> (${dup.outcome}, ${dup.date}).<br>Refer again anyway?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, refer again',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#0077BE',
    cancelButtonColor: '#6b7280',
  })
  return result.isConfirmed
}
