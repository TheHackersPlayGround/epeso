import type jsPDF from 'jspdf'
import { TIMES_NEW_ROMAN_NORMAL_BASE64 } from './TimesNewRomanNormal'
import { TIMES_NEW_ROMAN_BOLD_BASE64 } from './TimesNewRomanBold'

// The name every doc.setFont(...) call in this module's PDF exports uses
// instead of 'helvetica'.
export const PDF_FONT_FAMILY = 'TimesNewRoman'

// Embeds real Times New Roman instead of jsPDF's built-in 'times' (which can't
// render ₱ correctly) -- call once per `new jsPDF()`, before doc.setFont(PDF_FONT_FAMILY, ...).
export function registerPdfFont(doc: jsPDF) {
  doc.addFileToVFS('TimesNewRoman.ttf', TIMES_NEW_ROMAN_NORMAL_BASE64)
  doc.addFont('TimesNewRoman.ttf', PDF_FONT_FAMILY, 'normal')
  doc.addFileToVFS('TimesNewRoman-Bold.ttf', TIMES_NEW_ROMAN_BOLD_BASE64)
  doc.addFont('TimesNewRoman-Bold.ttf', PDF_FONT_FAMILY, 'bold')
}
