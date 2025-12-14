'use client'

import { getStaffStatusColor, getStaffStatusStyle, getStaffRoleColor, getStaffRoleStyle } from '@/lib/utils'
import { getInitials, getAvatarColor } from '@/lib/utils'
import { isLoginCodeValid } from '@/lib/constants'
import type { Staff } from '@/lib/types'

interface StaffCardProps {
  staff: Staff
  onEdit: () => void
  onDelete: () => void
  onGeneratePass: () => void
  onCopyCode: (code: string) => void
  showActions?: boolean // Optional: show Edit/Delete buttons (default: true)
}

export default function StaffCard({ 
  staff, 
  onEdit, 
  onDelete, 
  onGeneratePass,
  onCopyCode,
  showActions = true
}: StaffCardProps) {
  const hasValidLoginCode = isLoginCodeValid(staff.login_code, staff.login_code_expires_at)

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow break-inside-avoid flex flex-col">
      {/* Header with Avatar */}
      <div className="relative p-4 pb-12 border-b border-gray-100 bg-gradient-to-r from-gray-100 to-white rounded-t-xl">
        <div className="flex items-start justify-between mb-8">
          <div className="flex-1">
            <p className="text-xs text-gray-500">ID: {staff.staff_code}</p>
          </div>
          <span 
            className={`px-3 py-1 rounded-full text-xs font-semibold ${getStaffStatusColor(staff.status)}`}
            style={getStaffStatusStyle(staff.status)}
          >
            {staff.status}
          </span>
        </div>

        {/* Centered Avatar */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-10">
          <div className={`w-20 h-20 rounded-full ${getAvatarColor(staff.name)} flex items-center justify-center text-white text-xl font-bold border-4 border-white shadow-lg`}>
            {getInitials(staff.name)}
          </div>
        </div>
      </div>

      {/* Content with top padding for avatar */}
      <div className="pt-14 px-4 pb-4 space-y-3 flex-1">
        {/* Name and Role */}
        <div className="text-center mb-3">
          <h3 className="text-lg font-bold text-gray-800 mb-1">{staff.name}</h3>
          <span 
            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStaffRoleColor(staff.role)}`}
            style={getStaffRoleStyle(staff.role)}
          >
            {staff.role}
          </span>
        </div>
        {/* Phone */}
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <span className="text-sm text-gray-600">{staff.phone || '-'}</span>
        </div>

        {/* Login Code - Only for staff, not manager */}
        {staff.role !== 'manager' && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <div className="text-xs text-gray-500 mb-1">Kode Login</div>
            {hasValidLoginCode ? (
              <button
                onClick={() => onCopyCode(staff.login_code!)}
                className="font-mono text-sm font-semibold text-gray-700 hover:text-gray-900 hover:underline"
                title="Klik untuk copy"
              >
                {staff.login_code}
              </button>
            ) : (
              <button
                onClick={onGeneratePass}
                className="text-sm text-gray-700 hover:text-gray-900 font-medium hover:underline"
              >
                Generate Pass →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions - Always at bottom */}
      {showActions && (
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-2 rounded-b-xl">
          <button
            onClick={onEdit}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-xl transition"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="flex-1 px-4 py-2.5 text-sm font-medium bg-white border hover:bg-red-50 rounded-xl transition"
            style={{ color: '#FF6859', borderColor: '#FF6859' }}
          >
            Hapus
          </button>
        </div>
      )}
    </div>
  )
}
