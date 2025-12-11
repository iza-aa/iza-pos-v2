'use client'

import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface DeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  itemName: string
  description?: string
  confirmText?: string
  cancelText?: string
}

export default function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  description,
  confirmText = 'Delete',
  cancelText = 'Cancel'
}: DeleteModalProps) {
  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <XMarkIcon className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-700 mb-2">
            Are you sure you want to delete <span className="font-semibold">"{itemName}"</span>?
          </p>
          {description && (
            <p className="text-sm text-gray-500 mt-2">{description}</p>
          )}
          <p className="text-sm text-red-600 font-medium mt-3">
            This action cannot be undone.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-medium"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
