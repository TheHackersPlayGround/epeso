import { useState, useEffect, useCallback } from 'react'
import { Database, Download, Trash2 } from 'lucide-react'
import * as backupService from '../../services/backupService'
import type { BackupFile } from '../../services/backupService'
import ConfirmModal from '../shared/ConfirmModal'

export default function DataManagementTab() {
  const [backups, setBackups] = useState<BackupFile[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; type: 'confirm' | 'success' | 'error'
    title: string; message: string; confirmText?: string; cancelText?: string; onConfirm: () => void
  }>({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: () => {} })

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; name: string | null }>({ open: false, name: null })

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

  return (
    <>
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="mb-6">
            <h3 className="text-gray-800 m-0 mb-1">Backup</h3>
            <p className="text-gray-600 text-sm">Create and manage system database backups</p>
          </div>
          <div className="max-w-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
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
    </>
  )
}
