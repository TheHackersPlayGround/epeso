import { useState } from 'react'
import { Database } from 'lucide-react'
import ConfirmModal from '../shared/ConfirmModal'

export default function DataManagementTab() {
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; type: 'confirm' | 'success' | 'error'
    title: string; message: string; confirmText?: string; cancelText?: string; onConfirm: () => void
  }>({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: () => {} })

  const handleBackupDatabase = () => {
    setConfirmModal({
      isOpen: true, type: 'confirm', title: 'Backup Database',
      message: 'This will create a secure backup of the entire system database. Do you want to proceed?',
      confirmText: 'Yes, Backup Now', cancelText: 'Cancel',
      onConfirm: () => setConfirmModal({ isOpen: true, type: 'success', title: 'Backup Successful', message: 'Database backup created successfully!\n\nBackup file: PESO_DB_Backup_2026-06-20.sql', onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) }),
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
          <div className="max-w-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 flex-shrink-0 bg-gradient-to-br from-[#0077BE] to-[#006699] rounded-xl flex items-center justify-center shadow-md">
                <Database size={28} className="text-white" />
              </div>
              <div className="flex-grow min-w-0">
                <h4 className="text-gray-800 mb-1">Backup Database</h4>
                <p className="text-gray-600 text-sm">Create a secure backup of the system database</p>
              </div>
              <button onClick={handleBackupDatabase} className="flex-shrink-0 px-5 py-2.5 bg-[#0077BE] text-white rounded-lg hover:bg-[#006699] transition-colors font-medium shadow-sm hover:shadow-md whitespace-nowrap">
                Backup Now
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen} type={confirmModal.type} title={confirmModal.title}
        message={confirmModal.message} confirmText={confirmModal.confirmText} cancelText={confirmModal.cancelText}
        onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  )
}
