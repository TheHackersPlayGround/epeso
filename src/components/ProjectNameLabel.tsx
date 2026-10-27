// Shows a project name with its barangay, e.g. "Cassava Production · Brgy I" --
// barangay is just a display hint, since many barangays can share one project name.

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
