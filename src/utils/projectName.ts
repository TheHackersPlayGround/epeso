// Plain-text "Project Name · Barangay", for places that cannot show styled text
// (confirm messages, <select> options). Screens that can use <ProjectNameLabel> instead.
export function formatProjectName(name: string, barangay?: string | null): string {
  return barangay ? `${name} · ${barangay}` : name
}
