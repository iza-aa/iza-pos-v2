"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useSessionValidation } from "@/lib/hooks/useSessionValidation"
import { getCurrentUser, generateRandomCode } from "@/lib/utils"
import { TIME_UNITS, EXPIRATION_TIMES, TIMEOUT_DURATIONS } from "@/lib/constants"
import { supabase } from "@/lib/config/supabaseClient"
import { SearchBar, ViewModeToggle } from "@/app/components/ui"
import { StaffCard, StaffTable, QRPresenceModal } from "@/app/components/shared"
import AttendanceSection from "@/app/components/owner/staff-manager/AttendanceSection"
import type { ViewMode } from "@/app/components/ui/Form/ViewModeToggle"
import type { Staff } from "@/lib/types"
import { UsersIcon, ClockIcon, ChevronDownIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { BiQr } from 'react-icons/bi'

export default function ManagerStaffPage() {
  useSessionValidation()
  
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [copyMsg, setCopyMsg] = useState("")
  const [activeTab, setActiveTab] = useState<'staff' | 'presensi'>('staff')
  const [showTabDropdown, setShowTabDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Date range states for attendance
  const [dateRangeMode, setDateRangeMode] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all')
  const [showDateDropdown, setShowDateDropdown] = useState(false)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const dateDropdownRef = useRef<HTMLDivElement>(null)
  
  // QR Modal States
  const [showQrModal, setShowQrModal] = useState(false)
  const [presenceCode, setPresenceCode] = useState("")
  const [qrExpiresAt, setQrExpiresAt] = useState<Date | null>(null)
  const [qrTimer, setQrTimer] = useState(0)

  async function fetchStaff() {
    const currentUser = getCurrentUser()
    if (!currentUser) return
    
    const { data, error } = await supabase
      .from("staff")
      .select("*")
      .neq('role', 'owner') // Hide owner from manager view
      .neq('id', currentUser.id) // Hide current logged-in manager
      .order("created_at", { ascending: true })
    
    if (!error && data) setStaffList(data)
  }

  useEffect(() => {
    fetchStaff()
  }, [])

  // Filtered staff list based on search query
  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return staffList
    
    const query = searchQuery.toLowerCase()
    return staffList.filter(staff => 
      staff.name?.toLowerCase().includes(query) ||
      staff.staff_code?.toLowerCase().includes(query) ||
      staff.role?.toLowerCase().includes(query)
    )
  }, [staffList, searchQuery])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTabDropdown(false)
      }      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setShowDateDropdown(false)
      }    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // QR Timer
  useEffect(() => {
    if (!showQrModal || !qrExpiresAt) return
    const interval = setInterval(() => {
      const sisa = Math.max(0, Math.floor((qrExpiresAt.getTime() - Date.now()) / TIME_UNITS.SECOND))
      setQrTimer(sisa)
      if (sisa <= 0) {
        setShowQrModal(false)
        setPresenceCode("")
        setQrExpiresAt(null)
      }
    }, TIME_UNITS.SECOND)
    return () => clearInterval(interval)
  }, [showQrModal, qrExpiresAt])

  const handleGenerateQrAndCode = async () => {
    if (!window.confirm("Generate QR and Code?")) return

    const presence_code = generateRandomCode(8, true) // 8 chars, uppercase
    const expires_at = new Date(Date.now() + EXPIRATION_TIMES.QR_CODE).toISOString()

    const { error } = await supabase
      .from("presence_code")
      .insert([{ code: presence_code, expires_at }])

    if (error) {
      alert("Gagal generate kode presensi: " + error.message)
      return
    }

    setPresenceCode(presence_code)
    setQrExpiresAt(new Date(expires_at))
    setShowQrModal(true)
  }

  const handleGeneratePass = async (id: string) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const expiresAt = new Date(Date.now() + EXPIRATION_TIMES.STAFF_LOGIN) // 8 hours

    const { error } = await supabase
      .from("staff")
      .update({
        login_code: code,
        login_code_expires_at: expiresAt.toISOString(),
      })
      .eq("id", id)

    if (!error) {
      fetchStaff()
      handleCopyCode(code)
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopyMsg("Kode berhasil dicopy!")
    setTimeout(() => setCopyMsg(""), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-6 md:py-8">
      {copyMsg && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {copyMsg}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {activeTab === 'staff' ? 'Staff Management' : 'Presensi Staff'}
            </h1>
            <p className="text-sm md:text-base text-gray-600">
              {activeTab === 'staff' ? 'View staff list and generate login codes' : 'Riwayat kehadiran dan absensi staff'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* All Time Dropdown (only in Presensi tab) */}
            {activeTab === 'presensi' && (
              <div className="relative" ref={dateDropdownRef}>
                <button
                  onClick={() => setShowDateDropdown(!showDateDropdown)}
                  className="flex items-center gap-2 h-[38px] md:h-[42px] px-3 md:px-4 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition"
                >
                  <CalendarIcon className="w-4 h-4" />
                  <span className="font-medium">
                    {dateRangeMode === 'all' && 'All Time'}
                    {dateRangeMode === 'today' && 'Today'}
                    {dateRangeMode === 'week' && 'This Week (Last 7 Days)'}
                    {dateRangeMode === 'month' && 'This Month (Last 30 Days)'}
                    {dateRangeMode === 'custom' && 'Custom Range'}
                  </span>
                </button>

                {showDateDropdown && (
                  <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-lg z-50">
                    {/* Preset Options */}
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setDateRangeMode('all')
                          setShowDateDropdown(false)
                        }}
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${
                          dateRangeMode === 'all'
                            ? 'bg-gray-900 text-white'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        All Time
                      </button>
                      <button
                        onClick={() => {
                          setDateRangeMode('today')
                          setShowDateDropdown(false)
                        }}
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm transition mt-1 ${
                          dateRangeMode === 'today'
                            ? 'bg-gray-100 text-gray-900'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        Today
                      </button>
                      <button
                        onClick={() => {
                          setDateRangeMode('week')
                          setShowDateDropdown(false)
                        }}
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm transition mt-1 ${
                          dateRangeMode === 'week'
                            ? 'bg-gray-100 text-gray-900'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        This Week (Last 7 Days)
                      </button>
                      <button
                        onClick={() => {
                          setDateRangeMode('month')
                          setShowDateDropdown(false)
                        }}
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm transition mt-1 ${
                          dateRangeMode === 'month'
                            ? 'bg-gray-100 text-gray-900'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        This Month (Last 30 Days)
                      </button>
                    </div>

                    {/* Custom Range */}
                    <div className="border-t border-gray-200 p-4">
                      <p className="text-sm font-medium text-gray-700 mb-3">Custom Range</p>
                      <div className="space-y-3">
                        <div className="relative">
                          <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            placeholder="mm/dd/yyyy"
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                          />
                          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                        <div className="relative">
                          <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            placeholder="mm/dd/yyyy"
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                          />
                          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                        <button
                          onClick={() => {
                            if (customStartDate && customEndDate) {
                              setDateRangeMode('custom')
                              setShowDateDropdown(false)
                            }
                          }}
                          disabled={!customStartDate || !customEndDate}
                          className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Apply Custom Range
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Generate QR Button */}
            <button
              onClick={handleGenerateQrAndCode}
              className="flex items-center gap-2 h-[38px] md:h-[42px] px-3 md:px-4 bg-gray-100 text-gray-900 border border-gray-300 rounded-xl hover:bg-gray-200 transition"
              title="Generate QR and Code"
            >
              <BiQr className="w-4 md:w-5 h-4 md:h-5" />
              <span className="text-xs md:text-sm font-medium">Generate QR</span>
            </button>

            {/* Tab Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowTabDropdown(!showTabDropdown)}
                className="flex items-center gap-2 h-[38px] md:h-[42px] px-3 md:px-4 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition"
              >
              {activeTab === 'staff' ? (
                <>
                  <UsersIcon className="w-4 md:w-5 h-4 md:h-5" />
                  <span className="text-xs md:text-sm font-medium">Data Staff</span>
                </>
              ) : (
                <>
                  <ClockIcon className="w-4 md:w-5 h-4 md:h-5" />
                  <span className="text-xs md:text-sm font-medium">Presensi</span>
                </>
              )}
              <ChevronDownIcon className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {showTabDropdown && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
                <button
                  onClick={() => {
                    setActiveTab('staff')
                    setShowTabDropdown(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    activeTab === 'staff'
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <UsersIcon className="w-4 h-4" />
                  Data Staff
                </button>
                <button
                  onClick={() => {
                    setActiveTab('presensi')
                    setShowTabDropdown(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    activeTab === 'presensi'
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <ClockIcon className="w-4 h-4" />
                  Presensi Staff
                </button>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Search & View Mode */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <SearchBar
              value={activeTab === 'staff' ? searchQuery : attendanceSearchQuery}
              onChange={activeTab === 'staff' ? setSearchQuery : setAttendanceSearchQuery}
              placeholder={activeTab === 'staff' ? 'Cari nama, ID, atau role...' : 'Cari nama staff, status...'}
              width="w-full"
            />
          </div>
          <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {/* Staff Tab Content */}
        {activeTab === 'staff' && (
          <>
            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredStaff.map((staff) => (
                  <StaffCard
                    key={staff.id}
                    staff={staff}
                    onGeneratePass={() => handleGeneratePass(staff.id)}
                    onCopyCode={handleCopyCode}
                    onEdit={() => {}} // Dummy - Manager can't edit
                    onDelete={() => {}} // Dummy - Manager can't delete
                    showActions={false}
                  />
                ))}
              </div>
            ) : (
              <StaffTable
                staffList={filteredStaff}
                onGeneratePass={handleGeneratePass}
                onCopyCode={handleCopyCode}
                onEdit={() => {}} // Dummy - Manager can't edit
                onDelete={() => {}} // Dummy - Manager can't delete
                showActions={false}
              />
            )}

            {filteredStaff.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <p className="text-gray-500">
                  {searchQuery ? "Tidak ada staff yang ditemukan" : "Belum ada data staff"}
                </p>
              </div>
            )}
          </>
        )}

        {/* Presensi Tab Content */}
        {activeTab === 'presensi' && (
          <AttendanceSection 
            viewMode={viewMode}
            dateRangeMode={dateRangeMode}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
          />
        )}
      </div>

      {/* QR Presence Modal */}
      <QRPresenceModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        presenceCode={presenceCode}
        expiresAt={qrExpiresAt}
        remainingSeconds={qrTimer}
      />
    </div>
  )
}
