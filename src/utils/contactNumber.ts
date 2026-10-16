// Shared rules for every Contact Number field in the app.
//
// Accepts Philippine mobile numbers (09171234567, +63 917 123 4567) and
// landlines with an area code ((088) 123-4567, 02 8123 4567, +63 88 123 4567),
// plus a bare 7-8 digit local number. Spaces, hyphens and parentheses are
// allowed while typing; only digits and a leading "+" are counted.
// Deliberately not <input type="number">, which would drop the leading zero.

export const CONTACT_NUMBER_MESSAGE = 'Enter a valid contact number.'

const MAX_LENGTH = 20

/** Strips anything that can't be part of a phone number; "+" is kept only as the first character. */
export function sanitizeContactNumber(value: string): string {
  const cleaned = value.replace(/[^\d+\-()\s]/g, '')
  const plusAtStart = cleaned.startsWith('+')
  return ((plusAtStart ? '+' : '') + cleaned.replace(/\+/g, '')).slice(0, MAX_LENGTH)
}

/** True when `value` is a plausible mobile or landline number. Empty is NOT valid; callers decide whether blank is allowed. */
export function isValidContactNumber(value: string): boolean {
  const compact = value.replace(/[\s\-()]/g, '')
  if (!/^\+?\d+$/.test(compact)) return false
  const digits = compact.replace(/^\+/, '')
  // National form: leading 0, or the 63 country code (with or without "+").
  const national = digits.startsWith('63') && (compact.startsWith('+') || digits.length >= 11)
    ? '0' + digits.slice(2)
    : digits
  if (/^09\d{9}$/.test(national)) return true            // mobile
  if (/^0[2-8]\d?\d{7,8}$/.test(national)) return true  // landline with area code (09 is always mobile)
  if (/^\d{7,8}$/.test(digits) && !compact.startsWith('+')) return true // local number only
  return false
}

/**
 * For Excel import parsers: returns the trimmed number, or throws a row-level
 * error when a number is present but badly formatted (the import is
 * all-or-nothing, so one bad row blocks the whole file). Blank is returned as
 * blank; callers that require a number check that themselves.
 */
export function contactNumberOrThrow(value: string): string {
  const v = value.trim()
  if (v && !isValidContactNumber(v)) throw new Error(CONTACT_NUMBER_MESSAGE)
  return v
}
