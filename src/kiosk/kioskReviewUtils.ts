// Small text helpers the program forms use to build their kiosk review (see KioskReview.tsx).

/** "Dela Cruz, Juan Reyes Jr." */
export function fullName(last: string | undefined, first: string | undefined, middle: string | undefined = '', extension: string | undefined = ''): string {
  const given = [first, middle, extension].map(s => (s ?? '').trim()).filter(Boolean).join(' ')
  return [(last ?? '').trim(), given].filter(Boolean).join(', ')
}

/** Joins the parts that are filled in: "Purok 2, Maloro, Tangub City". */
export function joinText(...parts: Array<string | null | undefined>): string {
  return parts.map(p => (p ?? '').trim()).filter(Boolean).join(', ')
}

/** A list of choices as text, with an "Other" answer spelled out: "Student, Other: Vendor". */
export function listText(items: string[] | undefined, other?: string | string[]): string {
  const chosen = items ?? []
  const otherText = (Array.isArray(other) ? other.filter(Boolean).join(', ') : other ?? '').trim()
  const named = chosen.filter(c => !/^others?$/i.test(c))
  const hasOther = chosen.some(c => /^others?$/i.test(c)) || (chosen.length === 0 && otherText !== '')
  return [...named, ...(hasOther ? [otherText ? `Other: ${otherText}` : 'Other'] : [])].join(', ')
}

export const yesNo = (v: boolean | null | undefined): string => (v === true ? 'Yes' : v === false ? 'No' : '')
