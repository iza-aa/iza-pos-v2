'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/config/supabaseClient'
import { 
  CalendarIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

interface AttendanceRecord {
  id: string
  staff_id: string
  tanggal: string
  waktu_masuk: string
  waktu_keluar: string | null
  status: 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'alpha'
  keterangan: string | null
  staff: {
    name: string
    staff_code: string
    staff_type: string
  }
}

interface AttendanceSectionProps {
  onClose?: () => void
  viewMode?: 'card' | 'table'
  dateRangeMode?: 'all' | 'today' | 'week' | 'month' | 'custom'
  customStartDate?: string
  customEndDate?: string
}

export default function AttendanceSection({ 
  onClose, 
  viewMode = 'card',
  dateRangeMode = 'all',
  customStartDate = '',
  customEndDate = ''
}: AttendanceSectionProps) {
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    fetchAttendance()
  }, [dateRangeMode, customStartDate, customEndDate])

  async function fetchAttendance() {
    setLoading(true)
    try {
      let query = supabase
        .from('presensi_shift')
        .select(`
          *,
          staff (
            name,
            staff_code,
            staff_type
          )
        `)
        .order('waktu_masuk', { ascending: false })

      // Filter based on date range mode
      if (dateRangeMode === 'today') {
        query = query.eq('tanggal', selectedDate)
      } else if (dateRangeMode === 'week') {
        const weekAgo = new Date(selectedDate)
        weekAgo.setDate(weekAgo.getDate() - 7)
        query = query
          .gte('tanggal', weekAgo.toISOString().split('T')[0])
          .lte('tanggal', selectedDate)
      } else if (dateRangeMode === 'month') {
        const monthAgo = new Date(selectedDate)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        query = query
          .gte('tanggal', monthAgo.toISOString().split('T')[0])
          .lte('tanggal', selectedDate)
      } else if (dateRangeMode === 'custom' && customStartDate && customEndDate) {
        query = query
          .gte('tanggal', customStartDate)
          .lte('tanggal', customEndDate)
      }
      // If 'all', no date filter is applied

      const { data, error } = await query

      if (error) throw error
      setAttendanceList(data || [])
    } catch (error) {
      console.error('Error fetching attendance:', error)
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadge(status: string) {
    const badges = {
      hadir: { icon: CheckCircleIcon, color: 'bg-green-100 text-green-700 border-green-200', label: 'Hadir' },
      terlambat: { icon: ExclamationCircleIcon, color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Terlambat' },
      izin: { icon: ClockIcon, color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Izin' },
      sakit: { icon: ExclamationCircleIcon, color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Sakit' },
      alpha: { icon: XCircleIcon, color: 'bg-red-100 text-red-700 border-red-200', label: 'Alpha' }
    }
    const badge = badges[status as keyof typeof badges] || badges.hadir
    const Icon = badge.icon
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border ${badge.color}`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    )
  }

  function formatTime(timestamp: string | null) {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  function calculateHours(waktuMasuk: string, waktuKeluar: string | null) {
    if (!waktuKeluar) return '-'
    const start = new Date(waktuMasuk)
    const end = new Date(waktuKeluar)
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    return `${hours.toFixed(1)} jam`
  }

  // Group attendance by date
  const groupedByDate = attendanceList.reduce((acc, record) => {
    const date = record.tanggal
    if (!acc[date]) acc[date] = []
    acc[date].push(record)
    return acc
  }, {} as Record<string, AttendanceRecord[]>)

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && attendanceList.length === 0 && (
        <div className="text-center py-12">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada data presensi</h3>
          <p className="mt-1 text-sm text-gray-500">
            Belum ada staff yang melakukan presensi pada periode ini
          </p>
        </div>
      )}

      {/* Table View */}
      {!loading && viewMode === 'table' && attendanceList.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kode / Tipe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Waktu Masuk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Waktu Keluar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Jam
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Keterangan
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceList.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(record.tanggal).toLocaleDateString('id-ID', { 
                        day: '2-digit', 
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{record.staff.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{record.staff.staff_code}</div>
                      <div className="text-xs text-gray-400 capitalize">{record.staff.staff_type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(record.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(record.waktu_masuk)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(record.waktu_keluar)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {calculateHours(record.waktu_masuk, record.waktu_keluar)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {record.keterangan || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance List - Grouped by Date (Card View) */}
      {!loading && viewMode === 'card' && sortedDates.map((date) => (
        <div key={date} className="space-y-3">
          {/* Date Header */}
          <div className="flex items-center gap-3">
            <div className="bg-gray-900 text-white px-3 py-1.5 rounded-lg">
              <p className="text-xs font-medium">
                {new Date(date).toLocaleDateString('id-ID', { 
                  weekday: 'short', 
                  day: 'numeric', 
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </div>
            <div className="h-px bg-gray-200 flex-1" />
            <span className="text-xs text-gray-500">{groupedByDate[date].length} staff</span>
          </div>

          {/* Attendance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {groupedByDate[date].map((record) => (
              <div
                key={record.id}
                className="bg-gray-100 rounded-xl shadow border border-gray-200 overflow-hidden hover:shadow-lg transition"
              >
                {/* Header Card (Card dalam Card) */}
                <div className="m-[3px] p-2.5 md:p-3 border border-gray-300 rounded-xl bg-white">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        record.status === 'hadir' ? 'bg-green-500' :
                        record.status === 'terlambat' ? 'bg-yellow-500' :
                        record.status === 'izin' ? 'bg-blue-500' :
                        record.status === 'sakit' ? 'bg-orange-500' :
                        'bg-red-500'
                      }`} />
                      <span className={`text-xs font-bold uppercase ${
                        record.status === 'hadir' ? 'text-green-600' :
                        record.status === 'terlambat' ? 'text-yellow-600' :
                        record.status === 'izin' ? 'text-blue-600' :
                        record.status === 'sakit' ? 'text-orange-600' :
                        'text-red-600'
                      }`}>
                        {record.status}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(record.tanggal).toLocaleDateString('en-US', { 
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  
                  <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded uppercase">
                    {record.staff.staff_type}
                  </span>
                </div>

                {/* Content */}
                <div className="p-3 md:p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                    {record.staff.name} melakukan presensi
                  </h3>
                  
                  <div className="space-y-1 text-xs text-gray-600 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Staff:</span>
                      <span>{record.staff.name} ({record.staff.staff_code})</span>
                    </div>
                  </div>

                  {/* Time Details */}
                  <div className="bg-white border border-gray-300 rounded-lg p-2 md:p-3 mb-2">
                    <div className="text-xs font-medium text-gray-700 mb-2">Waktu:</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Masuk:</span>
                        <span className="font-medium text-gray-900">{formatTime(record.waktu_masuk)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Keluar:</span>
                        <span className="font-medium text-gray-900">{formatTime(record.waktu_keluar)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-100">
                        <span className="text-gray-600">Total Jam:</span>
                        <span className="font-semibold text-gray-900">
                          {calculateHours(record.waktu_masuk, record.waktu_keluar)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Keterangan */}
                  {record.keterangan && (
                    <div className="text-xs text-gray-500 italic border-t border-gray-100 pt-2">
                      💬 {record.keterangan}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
