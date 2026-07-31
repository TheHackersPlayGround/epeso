// Consistent per-program color across the General PESO Report's on-screen
// chart, its PDF chart images, and the exported Excel's native pie chart — so
// e.g. CDSP is always the same pink no matter which programs are selected or
// what order they end up in. Its own module (rather than living in
// ReportView.tsx) so generalPesoReport.ts can import it without a circular
// dependency on ReportView.tsx.
export const GENERAL_PESO_PROGRAM_COLORS: Record<string, string> = {
  'Employment Facilitation': '#3B82F6',
  'CDSP': '#EC4899',
  'GIP': '#06B6D4',
  'SPES': '#F97316',
  'Skills Training': '#F59E0B',
  'Livelihood': '#8B5CF6',
  'OFW Services': '#10B981',
}
