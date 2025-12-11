"use client"

import { useState, useEffect } from "react"
import { useSessionValidation } from "@/lib/useSessionValidation"
import { getCurrentUser } from '@/lib/authUtils'
import { supabase } from "@/lib/supabaseClient"
import { TIME_UNITS } from '@/lib/timeConstants'
import { showSuccess, showError } from '@/lib/errorHandling'
import { 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  QrCodeIcon
} from "@heroicons/react/24/outline"

interface Attendance {
  id: string
  staff_id: string
  tanggal: string
  waktu_masuk: string
  waktu_keluar: string | null
  status: string
  keterangan: string | null
  staff_name?: string
}

export default function AttendancePage() {
  useSessionValidation()
  
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null)
  const [loading, setLoading] = useState(true)
  const [clockingIn, setClockingIn] = useState(false)
  const [clockingOut, setClockingOut] = useState(false)
  const [showQRInput, setShowQRInput] = useState(false)
  const [presenceCode, setPresenceCode] = useState("")
  const [codeError, setCodeError] = useState("")

  const user = getCurrentUser();
  const userId = user?.id || null;
  const userName = user?.name || null;

  const fetchAttendances = async () => {
    if (!userId) return

    setLoading(true)
    
    // Fetch all attendance history
    const { data, error } = await supabase
      .from('presensi_shift')
      .select('*')
      .eq('staff_id', userId)
      .order('tanggal', { ascending: false })
      .order('waktu_masuk', { ascending: false })
      .limit(30) // Last 30 records

    if (!error && data) {
      setAttendances(data)
      
      // Check if clocked in today
      const today = new Date().toISOString().split('T')[0]
      const todayRecord = data.find(att => att.tanggal === today)
      setTodayAttendance(todayRecord || null)
    }
    
    setLoading(false)
  }

  useEffect(() => {
    fetchAttendances()
  }, [userId])

  const handleClockInWithCode = async () => {
    if (!userId || !presenceCode.trim()) {
      setCodeError('Masukkan kode presensi')
      return
    }

    setClockingIn(true)
    setCodeError('')

    // Verify presence code
    const { data: codeData, error: codeErr } = await supabase
      .from('presence_code')
      .select('*')
      .eq('code', presenceCode.trim().toUpperCase())
      .maybeSingle()

    if (codeErr || !codeData) {
      setCodeError('Kode presensi tidak valid')
      setClockingIn(false)
      return
    }

    // Check if code is expired
    if (new Date(codeData.expires_at) < new Date()) {
      setCodeError('Kode presensi sudah expired')
      setClockingIn(false)
      return
    }

    // Create attendance record
    const today = new Date().toISOString().split('T')[0]
    
    const { error } = await supabase
      .from('presensi_shift')
      .insert({
        staff_id: userId,
        tanggal: today,
        waktu_masuk: new Date().toISOString(),
        status: 'hadir',
        keterangan: `Presensi dengan kode: ${presenceCode.toUpperCase()}`
      })

    if (!error) {
      // Update usage count
      await supabase
        .from('presence_code')
        .update({ 
          used_count: (codeData.used_count || 0) + 1 
        })
        .eq('id', codeData.id)

      setPresenceCode('')
      setShowQRInput(false)
      await fetchAttendances()
    } else {
      setCodeError('Gagal clock in. Mungkin Anda sudah clock in hari ini.')
    }
    
    setClockingIn(false)
  }

  const handleClockIn = async () => {
    if (!userId) return

    setClockingIn(true)
    
    const today = new Date().toISOString().split('T')[0]
    
    const { error } = await supabase
      .from('presensi_shift')
      .insert({
        staff_id: userId,
        tanggal: today,
        waktu_masuk: new Date().toISOString(),
        status: 'hadir'
      })

    if (!error) {
      await fetchAttendances()
      showSuccess('Clock in berhasil')
    } else {
      showError('Gagal clock in. Mungkin Anda sudah clock in hari ini.')
    }
    
    setClockingIn(false)
  }

  const handleClockOut = async () => {
    if (!todayAttendance) return

    setClockingOut(true)

    const { error } = await supabase
      .from('presensi_shift')
      .update({
        waktu_keluar: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', todayAttendance.id)

    if (!error) {
      await fetchAttendances()
      showSuccess('Clock out berhasil')
    } else {
      showError('Gagal clock out.')
    }
    
    setClockingOut(false)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    const date = new Date(timeString)
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const calculateDuration = (start: string, end: string | null) => {
    if (!end) return '-'
    
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diff = endDate.getTime() - startDate.getTime()
    
    const hours = Math.floor(diff / TIME_UNITS.HOUR)
    const minutes = Math.floor((diff % TIME_UNITS.HOUR) / TIME_UNITS.MINUTE)
    
    return `${hours}j ${minutes}m`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hadir':
        return 'bg-green-100 text-green-800'
      case 'terlambat':
        return 'bg-yellow-100 text-yellow-800'
      case 'izin':
        return 'bg-blue-100 text-blue-800'
      case 'sakit':
        return 'bg-purple-100 text-purple-800'
      case 'alpha':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const canClockIn = !todayAttendance
  const canClockOut = todayAttendance && !todayAttendance.waktu_keluar

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-6 md:py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Attendance
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Manage your clock in/out and view attendance history
          </p>
        </div>

        {/* Clock In/Out Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <ClockIcon className="w-8 h-8 text-gray-700" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{userName}</h2>
                <p className="text-sm text-gray-600">
                  {new Date().toLocaleDateString('id-ID', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              {canClockIn && !showQRInput && (
                <>
                  <button
                    onClick={() => setShowQRInput(true)}
                    className="px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition flex items-center gap-2"
                  >
                    <QrCodeIcon className="w-5 h-5" />
                    Clock In dengan QR
                  </button>
                  <button
                    onClick={handleClockIn}
                    disabled={clockingIn}
                    className="px-6 py-3 bg-white border-2 border-gray-900 text-gray-900 rounded-xl font-medium hover:bg-gray-50 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    {clockingIn ? 'Clocking In...' : 'Clock In Manual'}
                  </button>
                </>
              )}

              {canClockOut && (
                <button
                  onClick={handleClockOut}
                  disabled={clockingOut}
                  className="px-6 py-3 bg-white border-2 border-gray-900 text-gray-900 rounded-xl font-medium hover:bg-gray-50 transition disabled:opacity-50 flex items-center gap-2"
                >
                  <XCircleIcon className="w-5 h-5" />
                  {clockingOut ? 'Clocking Out...' : 'Clock Out'}
                </button>
              )}

              {todayAttendance && todayAttendance.waktu_keluar && (
                <div className="px-6 py-3 bg-green-50 border-2 border-green-200 text-green-800 rounded-xl font-medium flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  Completed Today
                </div>
              )}
            </div>
          </div>

          {/* QR Code Input Section */}
          {showQRInput && canClockIn && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <QrCodeIcon className="w-5 h-5 text-gray-700" />
                  <h3 className="font-semibold text-gray-900">Masukkan Kode Presensi</h3>
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={presenceCode}
                    onChange={(e) => {
                      setPresenceCode(e.target.value.toUpperCase())
                      setCodeError('')
                    }}
                    placeholder="Contoh: ABC12345"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent uppercase font-mono"
                    maxLength={8}
                  />
                  <button
                    onClick={handleClockInWithCode}
                    disabled={clockingIn || !presenceCode.trim()}
                    className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50"
                  >
                    {clockingIn ? 'Verifying...' : 'Submit'}
                  </button>
                  <button
                    onClick={() => {
                      setShowQRInput(false)
                      setPresenceCode('')
                      setCodeError('')
                    }}
                    className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>

                {codeError && (
                  <div className="mt-2 text-sm text-red-600">
                    {codeError}
                  </div>
                )}

                <div className="mt-3 text-xs text-gray-500">
                  💡 Dapatkan kode dari owner/manager atau scan QR code yang ditampilkan
                </div>
              </div>
            </div>
          )}

          {/* Today's Status */}
          {todayAttendance && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Clock In</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatTime(todayAttendance.waktu_masuk)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Clock Out</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {todayAttendance.waktu_keluar ? formatTime(todayAttendance.waktu_keluar) : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Duration</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {calculateDuration(todayAttendance.waktu_masuk, todayAttendance.waktu_keluar)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Attendance History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Attendance History</h3>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          ) : attendances.length === 0 ? (
            <div className="p-12 text-center">
              <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Attendance Records
              </h3>
              <p className="text-gray-600">
                Clock in to start tracking your attendance
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Clock In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Clock Out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {attendances.map((att) => (
                    <tr key={att.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(att.tanggal)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatTime(att.waktu_masuk)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {att.waktu_keluar ? formatTime(att.waktu_keluar) : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {calculateDuration(att.waktu_masuk, att.waktu_keluar)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(att.status)}`}>
                          {att.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
