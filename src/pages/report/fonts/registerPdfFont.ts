import type jsPDF from 'jspdf'
import { TIMES_NEW_ROMAN_NORMAL_BASE64 } from './TimesNewRomanNormal'
import { TIMES_NEW_ROMAN_BOLD_BASE64 } from './TimesNewRomanBold'

// The name every doc.setFont(...) call in this module's PDF exports uses
// instead of 'helvetica'.
export const PDF_FONT_FAMILY = 'TimesNewRoman'

// Registers the real Times New Roman (normal + bold) into a jsPDF document's
// virtual file system, embedding the actual Microsoft font file rather than
// jsPDF's built-in 'times' -- that built-in is one of the PDF Standard-14
// fonts, which isn't a real embedded font at all (just a name PDF viewers are
// expected to substitute their own Times New Roman for) and only supports the
// old WinAnsi/Latin-1 character set. A character outside that set (e.g. the
// peso sign, ₱) isn't rejected or shown as a "missing glyph" box with the
// built-in font -- it silently renders whatever glyph collides at that code
// point instead, which is why "₱1,000" was showing up as something like
// "±1,000". Embedding the real font file (verified against U+20B1
// specifically) fixes this the same way DejaVu Sans did previously, while
// actually looking like Times New Roman instead of a substitute sans-serif.
// Call once per `new jsPDF()` instance, before any doc.setFont(PDF_FONT_FAMILY, ...) call.
export function registerPdfFont(doc: jsPDF) {
  doc.addFileToVFS('TimesNewRoman.ttf', TIMES_NEW_ROMAN_NORMAL_BASE64)
  doc.addFont('TimesNewRoman.ttf', PDF_FONT_FAMILY, 'normal')
  doc.addFileToVFS('TimesNewRoman-Bold.ttf', TIMES_NEW_ROMAN_BOLD_BASE64)
  doc.addFont('TimesNewRoman-Bold.ttf', PDF_FONT_FAMILY, 'bold')
}
