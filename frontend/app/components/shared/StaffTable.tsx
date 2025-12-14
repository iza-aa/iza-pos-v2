'use client'

import { getStaffStatusColor, getStaffStatusStyle } from '@/lib/utils'
import type { Staff } from '@/lib/types'

interface StaffTableProps {
  staffList: Staff[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onGeneratePass: (id: string) => void
  onCopyCode: (code: string) => void
  showActions?: boolean // Optional: show Edit/Delete buttons (default: true)
}

export default function StaffTable({ 
  staffList, 
  onEdit, 
  onDelete, 
  onGeneratePass,
  onCopyCode,
  showActions = true
}: StaffTableProps) {
  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-auto flex-1">
        <table className="w-full min-w-[800px] md:min-w-[1000px] table-fixed">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr className="border-b border-gray-200">
              <th className="w-[12%] px-3 md:px-6 py-3 md:py-4 text-left text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                ID Staff
              </th>
              <th className="w-[12%] px-3 md:px-6 py-3 md:py-4 text-left text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Nama
              </th>
              <th className="w-[12%] px-3 md:px-6 py-3 md:py-4 text-left text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="w-[12%] px-3 md:px-6 py-3 md:py-4 text-left text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                No WA
              </th>
              <th className="w-[12%] px-3 md:px-6 py-3 md:py-4 text-left text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Kode Login
              </th>
              <th className="w-[12%] px-3 md:px-6 py-3 md:py-4 text-left text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              {showActions && (
                <th className="w-[12%] px-3 md:px-6 py-3 md:py-4 text-left text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {staffList.map((staff) => {
              const hasValidLoginCode = staff.login_code && 
                staff.login_code_expires_at && 
                new Date(staff.login_code_expires_at) > new Date()

              return (
                <tr key={staff.id} className="hover:bg-gray-50 transition">
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap w-[12%]">
                    <div className="text-xs md:text-sm font-medium text-gray-900">{staff.staff_code}</div>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap w-[12%]">
                    <div className="text-xs md:text-sm font-medium text-gray-900">{staff.name}</div>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap w-[12%]">
                    <div className="text-xs md:text-sm text-gray-700">{staff.role}</div>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap w-[12%]">
                    <div className="text-xs md:text-sm text-gray-700">{staff.phone || '-'}</div>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap w-[12%]">
                    {staff.role === 'manager' ? (
                      <span className="text-xs md:text-sm text-gray-400">-</span>
                    ) : hasValidLoginCode ? (
                      <button
                        onClick={() => onCopyCode(staff.login_code!)}
                        className="text-xs md:text-sm font-mono font-semibold text-gray-700 hover:text-gray-900 hover:underline"
                        title="Klik untuk copy"
                      >
                        {staff.login_code}
                      </button>
                    ) : (
                      <button
                        onClick={() => onGeneratePass(staff.id)}
                        className="text-xs md:text-sm text-gray-700 hover:text-gray-900 font-medium hover:underline"
                      >
                        Generate Pass
                      </button>
                    )}
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap w-[12%]">
                    <span 
                      className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-semibold ${getStaffStatusColor(staff.status)}`}
                      style={getStaffStatusStyle(staff.status)}
                    >
                      {staff.status}
                    </span>
                  </td>
                  {showActions && (
                    <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-left w-[12%]">
                      <button
                        onClick={() => onEdit(staff.id)}
                        className="text-xs md:text-sm text-gray-700 hover:text-gray-900 font-medium mr-2 md:mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(staff.id)}
                        className="text-xs md:text-sm text-gray-700 hover:text-gray-900 font-medium"
                      >
                        Hapus
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
