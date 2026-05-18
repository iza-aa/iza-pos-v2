'use client'

import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface DeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  itemName: string
  description?: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
}

export default function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  description,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isLoading = false,
}: DeleteModalProps) {
  if (!isOpen) return null

  const handleConfirm = async () => {
    if (isLoading) return
    await onConfirm()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <p className="mt-1 text-sm text-gray-500">This action requires confirmation.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close delete confirmation"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-5">
          <p className="text-sm leading-6 text-gray-600">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-gray-900">&quot;{itemName}&quot;</span>?
          </p>

          {description ? (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-600">
              {description}
            </div>
          ) : null}

          <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-sm font-medium text-red-700">This action cannot be undone.</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Deleting...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}