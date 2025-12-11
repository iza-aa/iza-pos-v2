'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { roleOptions, statusOptions } from '@/lib/staffConstants'
import type { Staff } from '@/lib/types'

interface EditStaffModalProps {
  isOpen: boolean
  staff: Staff | null
  onClose: () => void
  onSave: (staff: Staff) => void
}

export default function EditStaffModal({ isOpen, staff, onClose, onSave }: EditStaffModalProps) {
  const [formData, setFormData] = useState<Staff>({
    id: '',
    staff_code: '',
    name: '',
    role: 'Kasir',
    phone: '',
    status: 'active'
  })

  // Update formData when staff prop changes
  useEffect(() => {
    if (staff) {
      setFormData(staff)
    }
  }, [staff])

  if (!isOpen || !staff) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Edit Staff</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Staff Code (readonly) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ID Staff
            </label>
            <input
              type="text"
              value={formData.staff_code}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama Staff <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="Masukkan nama staff"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {/* Phone (readonly) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              No WhatsApp
            </label>
            <input
              type="text"
              value={formData.phone}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">Nomor tidak dapat diubah</p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition font-medium"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
