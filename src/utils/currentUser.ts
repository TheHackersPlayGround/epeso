// The signed-in staff member's full name ("First Last"), read from the user App.tsx keeps in
// localStorage. Matches how the backend builds it, so a prefilled "Received By" and one the
// server fills in for a blank value are the same text. Empty string if nobody is stored.
export function currentUserFullName(): string {
  try {
    const u = JSON.parse(localStorage.getItem('peso_current_user') || '{}') as { firstName?: string; lastName?: string }
    return `${u.firstName ?? ''} ${u.lastName ?? ''}`.replace(/\s+/g, ' ').trim()
  } catch {
    return ''
  }
}

// "Received By" starts as the signed-in staff member on a NEW record (still editable: the person encoding isn't
// always the one who took the form), and a blank one is filled in when the form is saved. `applies` is false for
// edits and for the kiosk, which keep whatever they have.
export function withDefaultReceivedBy<T extends { receivedBy?: string }>(data: T, applies: boolean): T {
  return applies && !(data.receivedBy ?? '').trim() ? { ...data, receivedBy: currentUserFullName() } : data
}
