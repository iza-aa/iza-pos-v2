"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import { SearchBar, ViewModeToggle, DeleteModal } from "@/app/components/ui"
import { StaffCard, StaffTable, QRPresenceModal } from "@/app/components/shared"
import { StaffManagerHeader, EditStaffModal, AddStaffModal } from "@/app/components/owner/staff-manager"
import AttendanceSection from "@/app/components/owner/staff-manager/AttendanceSection"
import type { ViewMode } from "@/app/components/ui/Form/ViewModeToggle"
import type { NewStaffData } from "@/app/components/owner/staff-manager/AddStaffModal"
import bcrypt from "bcryptjs"
import { generateRandomCode } from '@/lib/utils'
import { TIME_UNITS, POLLING_INTERVALS, EXPIRATION_TIMES, TIMEOUT_DURATIONS } from '@/lib/constants'
import { showSuccess, showError, confirmDelete } from '@/lib/services/errorHandling'
import { logActivity } from '@/lib/services/activity/activityLogger'
import type { Staff } from '@/lib/types'
import { UsersIcon, ClockIcon, ChevronDownIcon, CalendarIcon } from '@heroicons/react/24/outline';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function StaffManagerPage() {
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [copyMsg, setCopyMsg] = useState("")
  const [showQrModal, setShowQrModal] = useState(false)
  const [presenceCode, setPresenceCode] = useState("")
  const [qrExpiresAt, setQrExpiresAt] = useState<Date | null>(null)
  const [qrTimer, setQrTimer] = useState(0)
  const [activeTab, setActiveTab] = useState<'staff' | 'presensi'>('staff')
  const [showTabDropdown, setShowTabDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Date range states for attendance
  const [dateRangeMode, setDateRangeMode] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all')
  const [showDateDropdown, setShowDateDropdown] = useState(false)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const dateDropdownRef = useRef<HTMLDivElement>(null)
  
  // Edit & Delete Modal States
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)

  async function fetchStaff() {
    const { data, error } = await supabase
      .from("staff")
      .select("*")
      .order("created_at", { ascending: true })
    if (!error && data) setStaffList(data)
  }

  useEffect(() => {
    fetchStaff()
  }, [])

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTabDropdown(false)
      }
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setShowDateDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const interval = setInterval(fetchStaff, POLLING_INTERVALS.SLOW)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTabDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  useEffect(() => {
    async function checkActivePresenceCode() {
      const { data } = await supabase
        .from("presence_code")
        .select("code, expires_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (data && new Date(data.expires_at) > new Date()) {
        setPresenceCode(data.code)
      }
    }
    checkActivePresenceCode()
  }, [])

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopyMsg("Kode berhasil disalin!")
    setTimeout(() => setCopyMsg(""), TIMEOUT_DURATIONS.SHORT)
  }

  const handleGeneratePass = async (id: string) => {
    const res = await fetch(`/api/staff/${id}/generate-pass`, {
      method: "POST",
    })
    const result = await res.json()

    if (!res.ok) {
      showError(result.error || "Gagal generate kode")
      return
    }

    fetchStaff()
    showSuccess("Kode login berhasil dikirim ke WhatsApp staff!")
  }

  const handleGenerateQrAndCode = async () => {
    if (!window.confirm("Generate QR and Code?")) return

    // Generate presence code menggunakan authUtils
    const presence_code = generateRandomCode(8, true) // 8 chars, uppercase
    const expires_at = new Date(Date.now() + EXPIRATION_TIMES.QR_CODE).toISOString()

    const { error } = await supabase
      .from("presence_code")
      .insert([{ code: presence_code, expires_at }])

    if (error) {
      showError("Gagal generate kode presensi: " + error.message)
      return
    }

    setPresenceCode(presence_code)
    setQrExpiresAt(new Date(expires_at))
    setShowQrModal(true)
  }

  const handleDelete = async (id: string) => {
    const staff = staffList.find(s => s.id === id)
    if (staff) {
      setSelectedStaff(staff)
      setShowDeleteModal(true)
    }
  }

  const confirmDelete = async () => {
    if (!selectedStaff) return

    const { error } = await supabase.from("staff").delete().eq("id", selectedStaff.id)

    if (error) {
      showError("Gagal menghapus staff: " + error.message)
      return
    }

    fetchStaff()
    setShowDeleteModal(false)
    showSuccess("Staff berhasil dihapus")
    
    // Log activity
    await logActivity({
      action: 'DELETE',
      category: 'STAFF',
      description: `Deleted staff: ${selectedStaff.name} (${selectedStaff.staff_code})`,
      resourceType: 'Staff',
      resourceId: selectedStaff.id,
      resourceName: selectedStaff.name,
      previousValue: {
        name: selectedStaff.name,
        staff_code: selectedStaff.staff_code,
        role: selectedStaff.role,
        staff_type: selectedStaff.staff_type
      },
      severity: 'critical',
      tags: ['staff', 'delete'],
      isReversible: false
    })
    
    setSelectedStaff(null)
  }

  const handleEdit = (id: string) => {
    const staff = staffList.find(s => s.id === id)
    if (staff) {
      setSelectedStaff(staff)
      setShowEditModal(true)
    }
  }

  const handleSaveEdit = async (updatedStaff: Staff) => {
    // Get old staff data for comparison
    const oldStaff = staffList.find(s => s.id === updatedStaff.id)
    
    const { error } = await supabase
      .from("staff")
      .update({
        name: updatedStaff.name,
        role: updatedStaff.role,
        status: updatedStaff.status
      })
      .eq("id", updatedStaff.id)

    if (error) {
      showError("Gagal update staff: " + error.message)
      return
    }

    fetchStaff()
    setShowEditModal(false)
    setSelectedStaff(null)
    showSuccess("Data staff berhasil diupdate")
    
    // Log activity
    if (oldStaff) {
      await logActivity({
        action: 'UPDATE',
        category: 'STAFF',
        description: `Updated staff: ${updatedStaff.name} (${updatedStaff.staff_code})`,
        resourceType: 'Staff',
        resourceId: updatedStaff.id,
        resourceName: updatedStaff.name,
        previousValue: {
          name: oldStaff.name,
          role: oldStaff.role,
          status: oldStaff.status
        },
        newValue: {
          name: updatedStaff.name,
          role: updatedStaff.role,
          status: updatedStaff.status
        },
        severity: 'info',
        tags: ['staff', 'update']
      })
    }
  }

  const handleAddStaff = async (staffData: NewStaffData) => {
    // Generate staff code
    const rolePrefix = staffData.role === 'manager' ? 'MGR' : 'STF'
    const count = staffList.filter(s => s.role === staffData.role).length + 1
    const staff_code = `${rolePrefix}${String(count).padStart(3, '0')}`
    
    // Prepare data
    const newStaffData: any = {
      staff_code,
      name: staffData.name,
      email: staffData.email || null,
      phone: staffData.phone || null,
      role: staffData.role,
      staff_type: staffData.staff_type || null,
      status: 'active',
      hired_date: new Date().toISOString().split('T')[0]
    }
    
    // Hash password for manager
    if (staffData.role === 'manager' && staffData.password) {
      const hashedPassword = await bcrypt.hash(staffData.password, 10)
      newStaffData.password_hash = hashedPassword
    }
    
    const { error } = await supabase
      .from('staff')
      .insert([newStaffData])
    
    if (error) {
      throw new Error(error.message)
    }
    
    fetchStaff()
    
    // Log activity
    await logActivity({
      action: 'CREATE',
      category: 'STAFF',
      description: `Created new staff: ${staffData.name} (${staff_code})`,
      resourceType: 'Staff',
      resourceId: staff_code, // Use staff_code as temporary ID
      resourceName: staffData.name,
      newValue: {
        name: staffData.name,
        staff_code: staff_code,
        role: staffData.role,
        staff_type: staffData.staff_type
      },
      severity: 'info',
      tags: ['staff', 'create']
    })
  }

  return (
    <div className="h-[calc(100vh-55px)] flex flex-col overflow-hidden">
      <section className="flex-shrink-0 px-4 md:px-6 pt-4 md:pt-6 bg-white border-b border-gray-200">
        <StaffManagerHeader
          title={activeTab === 'staff' ? 'Staff Manager' : 'Presensi Staff'}
          description={activeTab === 'staff' ? 'Kelola data staff, role, status, dan kode login.' : 'Riwayat kehadiran dan absensi staff'}
          onGenerateQR={handleGenerateQrAndCode}
          onAddStaff={() => setShowAddModal(true)}
          activeTab={activeTab}
        >
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

          <ViewModeToggle
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {/* Tab Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowTabDropdown(!showTabDropdown)}
              className="flex items-center gap-2 h-[38px] md:h-[42px] px-3 md:px-4 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition"
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
        </StaffManagerHeader>
      </section>

      <section className="flex-1 overflow-y-auto bg-gray-100 px-4 md:px-6 py-4 md:py-6">
        {/* Staff Tab Content */}
        {activeTab === 'staff' && (
          <>
            {viewMode === 'card' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                {staffList.map((staff) => (
                  <StaffCard
                    key={staff.id}
                    staff={staff}
                    onEdit={() => handleEdit(staff.id)}
                    onDelete={() => handleDelete(staff.id)}
                    onGeneratePass={() => handleGeneratePass(staff.id)}
                    onCopyCode={handleCopy}
                  />
                ))}
              </div>
            )}

            {viewMode === 'table' && (
              <div className="h-full">
                <StaffTable
                  staffList={staffList}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onGeneratePass={handleGeneratePass}
                  onCopyCode={handleCopy}
                />
              </div>
            )}

            {staffList.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  Belum ada data staff
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
      </section>

      {/* QR Presence Modal */}
      <QRPresenceModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        presenceCode={presenceCode}
        expiresAt={qrExpiresAt}
        remainingSeconds={qrTimer}
      />

      {copyMsg && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow z-50">
          {copyMsg}
        </div>
      )}

      {/* Edit Staff Modal */}
      <EditStaffModal
        isOpen={showEditModal}
        staff={selectedStaff}
        onClose={() => {
          setShowEditModal(false)
          setSelectedStaff(null)
        }}
        onSave={handleSaveEdit}
      />

      {/* Add Staff Modal */}
      {showAddModal && (
        <AddStaffModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddStaff}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setSelectedStaff(null)
        }}
        onConfirm={confirmDelete}
        title="Hapus Staff"
        itemName={selectedStaff?.name || ''}
        description="Staff yang dihapus tidak dapat dikembalikan. Apakah Anda yakin?"
        confirmText="Hapus"
        cancelText="Batal"
      />
    </div>
  )
}
