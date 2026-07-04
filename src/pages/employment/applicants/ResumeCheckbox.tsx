type ResumeCheckboxProps = {
  label: string        // human-readable label shown next to the checkbox
  isAvailable: boolean // whether the applicant has data for this field
  isChecked: boolean   // whether the field is currently selected
  onToggle: () => void // called when the user clicks the checkbox
}

export default function ResumeCheckbox({ label, isAvailable, isChecked, onToggle }: ResumeCheckboxProps) {
  return (
    <label className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all ${isAvailable ? 'hover:bg-blue-50' : 'opacity-40 cursor-not-allowed'}`}>
      <input
        type="checkbox"
        checked={isChecked && isAvailable}
        onChange={onToggle}
        disabled={!isAvailable}
        className="w-4 h-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue disabled:opacity-50 flex-shrink-0"
      />
      <span className={`text-sm ${isAvailable ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
    </label>
  );
}
