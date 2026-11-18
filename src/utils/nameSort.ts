// Sorting people by first name or by surname, for the lists that hold a person's name as ONE text.
//
// The system writes such a name as "SURNAME, First M." (for example "DIMASUHID, ANTONIO N."), so the surname is everything before the comma and
// the first name is the first word after it. (Splitting the text on spaces would take the SURNAME as the "first" word.) A name with no comma is read
// as "First Last". Lists that keep first name and last name in separate fields do not need this.

/** The part of a name to sort on, in lower case. */
export function nameSortKey(fullName: string | null | undefined, by: 'first' | 'last'): string {
  const name = (fullName ?? '').trim()
  const comma = name.indexOf(',')
  if (comma >= 0) {
    const surname = name.slice(0, comma).trim()
    const firstName = name.slice(comma + 1).trim().split(/\s+/)[0] ?? ''
    return (by === 'first' ? firstName : surname).toLowerCase()
  }
  const words = name.split(/\s+/)
  return ((by === 'first' ? words[0] : words[words.length - 1]) ?? '').toLowerCase()
}

/** For Array.sort: by the chosen name first; people with the same one are then ordered by the other name. */
export function compareByName(a: string | null | undefined, b: string | null | undefined, by: 'first' | 'last', ascending: boolean): number {
  const other = by === 'first' ? 'last' : 'first'
  const result = nameSortKey(a, by).localeCompare(nameSortKey(b, by)) || nameSortKey(a, other).localeCompare(nameSortKey(b, other))
  return ascending ? result : -result
}
