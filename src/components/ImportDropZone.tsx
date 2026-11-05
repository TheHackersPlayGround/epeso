import { useEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { Upload } from 'lucide-react'

// The "click to upload or drag and drop" box used by every Import modal.
//
// Clicking opens the file picker (the hidden input). Dragging an Excel file over the box
// highlights it, and dropping it picks the file, exactly like choosing it from the picker.
//
// Props:
//   file      the file picked so far (its name is shown), or null
//   onPick    called with the chosen file
//   onReject  called with a message when something that is not one Excel file is dropped
//   disabled  true while an import is running
//
// While the box is on screen, a file dropped anywhere else on the page is ignored. Without
// that, a drop that just misses the box makes the browser open the file and leave the app.

const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls']

interface ImportDropZoneProps {
  file: File | null
  onPick: (file: File | null) => void
  onReject?: (message: string) => void
  disabled?: boolean
}

function isExcelFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return ACCEPTED_EXTENSIONS.some(ext => name.endsWith(ext))
}

// True when the thing being dragged is a file (not selected text or a link).
function isDraggingFiles(e: { dataTransfer: DataTransfer | null }): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes('Files')
}

export default function ImportDropZone({ file, onPick, onReject, disabled = false }: ImportDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  // dragenter/dragleave fire for every child element, so count them instead of toggling.
  const dragDepth = useRef(0)

  // Stop the browser from opening a file that is dropped just outside the box.
  useEffect(() => {
    const blockStrayDrop = (e: globalThis.DragEvent) => { if (isDraggingFiles(e)) e.preventDefault() }
    window.addEventListener('dragover', blockStrayDrop)
    window.addEventListener('drop', blockStrayDrop)
    return () => {
      window.removeEventListener('dragover', blockStrayDrop)
      window.removeEventListener('drop', blockStrayDrop)
    }
  }, [])

  function handleDragEnter(e: DragEvent<HTMLLabelElement>) {
    if (disabled || !isDraggingFiles(e)) return
    e.preventDefault()
    dragDepth.current += 1
    setIsDragging(true)
  }

  function handleDragOver(e: DragEvent<HTMLLabelElement>) {
    if (disabled || !isDraggingFiles(e)) return
    e.preventDefault() // required, or the browser refuses the drop
    e.dataTransfer.dropEffect = 'copy'
  }

  function handleDragLeave() {
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setIsDragging(false)
  }

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    dragDepth.current = 0
    setIsDragging(false)
    if (disabled) return

    const dropped = Array.from(e.dataTransfer.files)
    if (dropped.length === 0) return
    if (dropped.length > 1) {
      onReject?.('Please drop one file at a time.')
      return
    }
    if (!isExcelFile(dropped[0])) {
      onReject?.('Only Excel files (.xlsx) can be imported.')
      return
    }
    onPick(dropped[0])
  }

  const highlighted = isDragging || file

  return (
    <label
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`block w-full border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      } ${highlighted ? 'border-brand-blue bg-blue-50' : 'border-gray-300 hover:border-brand-blue hover:bg-blue-50'}`}
    >
      <Upload size={28} className="mx-auto text-gray-400 mb-2" />
      <p className="text-sm text-gray-600 break-all">
        {isDragging ? 'Drop the file here' : file ? file.name : 'Click to upload or drag and drop'}
      </p>
      <p className="text-xs text-gray-400 mt-1">.xlsx files only</p>
      <input
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        disabled={disabled}
        onChange={e => {
          onPick(e.target.files?.[0] ?? null)
          e.target.value = '' // so picking the same file again still fires onChange
        }}
      />
    </label>
  )
}
