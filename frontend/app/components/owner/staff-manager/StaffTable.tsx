'use client'

interface Staff {
  id: string
  staff_code: string
  name: string
  role: string
  phone: string
  status: string
  login_code?: string
  login_code_expires_at?: string
}

interface StaffTableProps {
  staffList: Staff[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onGeneratePass: (id: string) => void
  onCopyCode: (code: string) => void
}

export default function StaffTable({ 
  staffList, 
  onEdit, 
  onDelete, 
  onGeneratePass,
  onCopyCode 
}: StaffTableProps) {
  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase().trim()
    if (statusLower === 'aktif' || statusLower === 'active') {
      return ''
    }
    if (statusLower === 'nonaktif' || statusLower === 'non-aktif' || statusLower === 'inactive') {
      return ''
    }
    return 'bg-gray-500 text-white'
  }

  const getStatusStyle = (status: string) => {
    const statusLower = status.toLowerCase().trim()
    if (statusLower === 'aktif' || statusLower === 'active') {
      return { backgroundColor: '#B2FF5E', color: '#166534' }
    }
    if (statusLower === 'nonaktif' || statusLower === 'non-aktif' || statusLower === 'inactive') {
      return { backgroundColor: '#FF6859', color: '#7f1d1d' }
    }
    return {}
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-auto flex-1">
        <table className="w-full min-w-[1000px] table-fixed">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr className="border-b border-gray-200">
              <th className="w-[12%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                ID Staff
              </th>
              <th className="w-[12%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Nama
              </th>
              <th className="w-[12%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="w-[12%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                No WA
              </th>
              <th className="w-[12%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Kode Login
              </th>
              <th className="w-[12%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="w-[12%] px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {staffList.map((staff) => {
              const hasValidLoginCode = staff.login_code && 
                staff.login_code_expires_at && 
                new Date(staff.login_code_expires_at) > new Date()

              return (
                <tr key={staff.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap w-[12%]">
                    <div className="text-sm font-medium text-gray-900">{staff.staff_code}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap w-[12%]">
                    <div className="text-sm font-medium text-gray-900">{staff.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap w-[12%]">
                    <div className="text-sm text-gray-700">{staff.role}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap w-[12%]">
                    <div className="text-sm text-gray-700">{staff.phone || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap w-[12%]">
                    {hasValidLoginCode ? (
                      <button
                        onClick={() => onCopyCode(staff.login_code!)}
                        className="text-sm font-mono font-semibold text-gray-700 hover:text-gray-900 hover:underline"
                        title="Klik untuk copy"
                      >
                        {staff.login_code}
                      </button>
                    ) : (
                      <button
                        onClick={() => onGeneratePass(staff.id)}
                        className="text-sm text-gray-700 hover:text-gray-900 font-medium hover:underline"
                      >
                        Generate Pass
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap w-[12%]">
                    <span 
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(staff.status)}`}
                      style={getStatusStyle(staff.status)}
                    >
                      {staff.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-left w-[12%]">
                    <button
                      onClick={() => onEdit(staff.id)}
                      className="text-gray-700 hover:text-gray-900 font-medium mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(staff.id)}
                      className="text-gray-700 hover:text-gray-900 font-medium"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
