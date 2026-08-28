import { useState, useEffect, useCallback, useRef } from 'react'
import { Database, Download, Trash2, RotateCcw, AlertTriangle, Loader2, UploadCloud } from 'lucide-react'
import * as backupService from '../../services/backupService'
import type { BackupFile } from '../../services/backupService'
import ConfirmModal from '../shared/ConfirmModal'

// Either an existing on-server backup (Recover in the history list) or a
// file the admin just picked from their own machine (Restore from File,
// for when the on-server copy was deleted and only an external copy
// remains). Both end up hitting the same danger-confirmation UI below.
type RestoreTarget = { kind: 'existing'; name: string } | { kind: 'upload'; file: File }

// Restoring overwrites the live database (and uploads/ if bundled) with one
// backup's contents -- a misclick here is far more costly than a normal
// delete confirm, so it requires typing the exact filename rather than a
// single click, matching the "type to confirm" pattern used for other
// irreversible actions (e.g. deleting a GitHub repo).
function RestoreConfirmModal({ target, onClose, onRestored }: {
  target: RestoreTarget
  onClose: () => void
  onRestored: (result: { uploadsRestored: boolean; safetyBackup: string }) => void
}) {
  const displayName = target.kind === 'existing' ? target.name : target.file.name
  const [typedName, setTypedName] = useState('')
  const [isRestoring, setIsRestoring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const matches = typedName === displayName

  const handleRestore = async () => {
    if (!matches || isRestoring) return
    setIsRestoring(true)
    setError(null)
    try {
      const res = target.kind === 'existing'
        ? await backupService.restoreBackup(target.name)
        : await backupService.restoreUpload(target.file)
      onRestored(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore this backup.')
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-8">
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-gray-800 font-semibold text-lg mb-2">This will overwrite all current data</h3>
          <p className="text-gray-600 text-sm">
            Restoring <span className="font-medium text-gray-800">{displayName}</span> permanently replaces the entire
            live database{displayName.toLowerCase().endsWith('.zip') ? ' and every uploaded document' : ''} with this backup's
            contents. Anything created or changed since then will be lost. <span className="font-medium">This cannot be undone.</span>
          </p>
          <p className="text-gray-500 text-xs mt-2">
            A fresh safety backup of the current state is taken automatically right before restoring.
          </p>
        </div>

        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Type <span className="font-mono text-gray-900">{displayName}</span> to confirm
        </label>
        <input
          value={typedName}
          onChange={e => setTypedName(e.target.value)}
          disabled={isRestoring}
          placeholder={displayName}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent disabled:opacity-50"
        />
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} disabled={isRestoring}
            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleRestore} disabled={!matches || isRestoring}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
            {isRestoring && <Loader2 size={14} className="animate-spin" />}
            {isRestoring ? 'Restoring…' : 'Restore'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DataManagementTab() {
  const [backups, setBackups] = useState<BackupFile[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; type: 'confirm' | 'success' | 'error'
    title: string; message: string; confirmText?: string; cancelText?: string; onConfirm: () => void
  }>({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: () => {} })

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; name: string | null }>({ open: false, name: null })
  const [restoreTarget, setRestoreTarget] = useState<RestoreTarget | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const closeModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
  const showError = (message: string) =>
    setConfirmModal({ isOpen: true, type: 'error', title: 'Error', message, onConfirm: closeModal })

  const refreshBackups = useCallback(async () => {
    setLoading(true)
    try {
      const res = await backupService.listBackups()
      setBackups(res.data ?? [])
    } catch {
      // silent — show empty list rather than crashing
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refreshBackups() }, [refreshBackups])

  const handleBackupDatabase = () => {
    setConfirmModal({
      isOpen: true, type: 'confirm', title: 'Backup Database',
      message: 'This will create a secure backup of the entire system database. Do you want to proceed?',
      confirmText: 'Yes, Backup Now', cancelText: 'Cancel',
      onConfirm: async () => {
        closeModal()
        setCreating(true)
        try {
          const res = await backupService.createBackup()
          await refreshBackups()
          setConfirmModal({
            isOpen: true, type: 'success', title: 'Backup Successful',
            message: `Database backup created successfully!\n\nBackup file: ${res.data.name} (${res.data.size})`,
            onConfirm: closeModal,
          })
        } catch (err) {
          showError(err instanceof Error ? err.message : 'Failed to create the backup.')
        } finally {
          setCreating(false)
        }
      },
    })
  }

  const handleDownload = async (name: string) => {
    try {
      await backupService.downloadBackup(name)
    } catch {
      showError('Failed to download the backup file.')
    }
  }

  const handleDeleteBackup = async (name: string) => {
    setDeleteConfirm({ open: false, name: null })
    try {
      await backupService.deleteBackup(name)
      await refreshBackups()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete the backup.')
    }
  }

  const handleFilePicked = (file: File | undefined) => {
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file) return
    const ext = file.name.toLowerCase().split('.').pop()
    if (ext !== 'sql' && ext !== 'zip') {
      showError('Only .sql or .zip backup files are accepted.')
      return
    }
    setRestoreTarget({ kind: 'upload', file })
  }

  const handleRestored = async (result: { uploadsRestored: boolean; safetyBackup: string }) => {
    setRestoreTarget(null)
    await refreshBackups()
    // A restore swaps out the entire database underneath the running app --
    // every other tab/page already has old data sitting in memory that
    // won't know to refetch on its own. Reloading the whole page once the
    // admin acknowledges this dialog is simpler and more reliable than
    // trying to invalidate every context/query in the app individually.
    setConfirmModal({
      isOpen: true, type: 'success', title: 'Restore Complete',
      message: `The system has been restored${result.uploadsRestored ? ' (database and uploaded files)' : ' (database only -- this backup had no bundled documents)'}.\n\nA safety backup of the previous state was created: ${result.safetyBackup}\n\nThe page will now reload to reflect the restored data.`,
      onConfirm: () => window.location.reload(),
    })
  }

  return (
    <>
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="mb-6">
            <h3 className="text-gray-800 m-0 mb-1">Backup</h3>
            <p className="text-gray-600 text-sm">Create and manage system database backups</p>
          </div>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 flex-shrink-0 bg-gradient-to-br from-[#0077BE] to-[#006699] rounded-xl flex items-center justify-center shadow-md">
                  <Database size={28} className="text-white" />
                </div>
                <div className="flex-grow min-w-0">
                  <h4 className="text-gray-800 mb-1">Backup Database</h4>
                  <p className="text-gray-600 text-sm">Create a secure backup of the system database</p>
                </div>
                <button onClick={handleBackupDatabase} disabled={creating}
                  className="flex-shrink-0 px-5 py-2.5 bg-[#0077BE] text-white rounded-lg hover:bg-[#006699] transition-colors font-medium shadow-sm hover:shadow-md whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                  {creating ? 'Backing Up…' : 'Backup Now'}
                </button>
              </div>
            </div>

            <div className="flex-1 bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 flex-shrink-0 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-md">
                  <UploadCloud size={28} className="text-white" />
                </div>
                <div className="flex-grow min-w-0">
                  <h4 className="text-gray-800 mb-1">Restore from File</h4>
                  <p className="text-gray-600 text-sm">If a backup was deleted here but you still have a copy saved elsewhere</p>
                </div>
                <input ref={fileInputRef} type="file" accept=".sql,.zip" className="hidden"
                  onChange={e => handleFilePicked(e.target.files?.[0])} />
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium shadow-sm hover:shadow-md whitespace-nowrap">
                  Upload & Recover
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="mb-4">
            <h4 className="text-gray-800 m-0 mb-1">Backup History</h4>
            <p className="text-gray-600 text-sm">Previously created backups, newest first</p>
          </div>
          {loading ? (
            <p className="text-gray-400 text-sm py-6 text-center">Loading…</p>
          ) : backups.length === 0 ? (
            <p className="text-gray-400 text-sm py-6 text-center">No backups yet — click "Backup Now" to create one.</p>
          ) : (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
              {backups.map(b => (
                <div key={b.name} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{b.name}</p>
                    <p className="text-xs text-gray-500">{b.createdAt} · {b.size}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => handleDownload(b.name)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                      <Download size={14} /> Download
                    </button>
                    <button onClick={() => setRestoreTarget({ kind: 'existing', name: b.name })}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 text-sm">
                      <RotateCcw size={14} /> Recover
                    </button>
                    <button onClick={() => setDeleteConfirm({ open: true, name: b.name })}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm">
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen} type={confirmModal.type} title={confirmModal.title}
        message={confirmModal.message} confirmText={confirmModal.confirmText} cancelText={confirmModal.cancelText}
        onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
      <ConfirmModal
        isOpen={deleteConfirm.open} type="confirm"
        title="Delete Backup" message="This will permanently delete this backup file. This cannot be undone."
        confirmText="Delete" cancelText="Cancel"
        onConfirm={() => deleteConfirm.name && handleDeleteBackup(deleteConfirm.name)}
        onCancel={() => setDeleteConfirm({ open: false, name: null })}
      />
      {restoreTarget && (
        <RestoreConfirmModal
          target={restoreTarget}
          onClose={() => setRestoreTarget(null)}
          onRestored={handleRestored}
        />
      )}
    </>
  )
}
