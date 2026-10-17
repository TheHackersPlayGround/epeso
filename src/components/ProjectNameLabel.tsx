// Shows a project name with its barangay beside it, e.g. "Cassava Production · Brgy I".
// The barangay is lighter and not bold so the two read as different things.
// Many barangays can run the same project, so the name alone is not enough to tell them apart.
// The barangay is added only for display -- the saved project name stays exactly as typed.

interface ProjectNameLabelProps {
  name: string
  barangay?: string | null
  /** Classes for the project name part, e.g. its size and weight. */
  className?: string
}

export default function ProjectNameLabel({ name, barangay, className = '' }: ProjectNameLabelProps) {
  return (
    <span className={className}>
      {name}
      {barangay && <span className="font-normal text-gray-400"> · {barangay}</span>}
    </span>
  )
}
