"use client"

import { useState } from "react"
import { XMarkIcon, UserPlusIcon } from "@heroicons/react/24/outline"

interface AddStaffModalProps {
  onClose: () => void
  onSave: (staffData: NewStaffData) => Promise<void>
}

export interface NewStaffData {
  name: string
  email: string
  phone: string
  role: 'manager' | 'staff'
  staff_type?: 'barista' | 'cashier' | 'kitchen' | 'waiter' | null
  password?: string // For manager
}

export default function AddStaffModal({ onClose, onSave }: AddStaffModalProps) {
  const [formData, setFormData] = useState<NewStaffData>({
    name: '',
    email: '',
    phone: '',
    role: 'staff',
    staff_type: 'barista',
    password: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Validation
    if (!formData.name.trim()) {
      setError('Name is required')
      return
    }
    
    if (formData.role === 'manager') {
      if (!formData.email.trim()) {
        setError('Email is required for Manager')
        return
      }
      if (!formData.password || formData.password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
    }
    
    if (formData.role === 'staff' && !formData.staff_type) {
      setError('Staff type is required')
      return
    }

    setLoading(true)
    try {
      await onSave(formData)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to add staff')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <UserPlusIcon className="w-5 h-5 text-gray-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add New Staff</h2>
              <p className="text-xs text-gray-500">Create a new staff or manager account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="John Doe"
              required
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ 
                ...formData, 
                role: e.target.value as 'manager' | 'staff',
                staff_type: e.target.value === 'manager' ? null : 'barista'
              })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
            </select>
          </div>

          {/* Staff Type (only for staff role) */}
          {formData.role === 'staff' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Staff Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.staff_type || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  staff_type: e.target.value as 'barista' | 'cashier' | 'kitchen' | 'waiter'
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="barista">Barista</option>
                <option value="cashier">Cashier</option>
                <option value="kitchen">Kitchen</option>
                <option value="waiter">Waiter</option>
              </select>
            </div>
          )}

          {/* Email (required for manager) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email {formData.role === 'manager' && <span className="text-red-500">*</span>}
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="john@example.com"
              required={formData.role === 'manager'}
            />
            {formData.role === 'manager' && (
              <p className="text-xs text-gray-500 mt-1">Manager uses email to login</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="08123456789"
            />
          </div>

          {/* Password (only for manager) */}
          {formData.role === 'manager' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Initial Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Minimum 6 characters"
                required
                minLength={6}
              />
              <p className="text-xs text-gray-500 mt-1">
                Manager will be required to change password on first login
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-600">
              {formData.role === 'staff' ? (
                <>
                  <strong>Staff</strong> will receive a login code (QR) that you can generate after creation.
                </>
              ) : (
                <>
                  <strong>Manager</strong> will use email and password to login. They must change password on first login.
                </>
              )}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
