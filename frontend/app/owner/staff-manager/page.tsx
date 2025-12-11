"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@supabase/supabase-js"
import { SearchBar, ViewModeToggle, DeleteModal } from "@/app/components/ui"
import { StaffCard, StaffTable, QRPresenceModal } from "@/app/components/shared"
import { StaffManagerHeader, EditStaffModal, AddStaffModal } from "@/app/components/owner/staff-manager"
import type { ViewMode } from "@/app/components/ui/Form/ViewModeToggle"
import type { NewStaffData } from "@/app/components/owner/staff-manager/AddStaffModal"
import bcrypt from "bcryptjs"
import { generateRandomCode } from '@/lib/authUtils'
import { TIME_UNITS, POLLING_INTERVALS, EXPIRATION_TIMES, TIMEOUT_DURATIONS } from '@/lib/timeConstants'
import { showSuccess, showError, confirmDelete } from '@/lib/errorHandling'
import type { Staff } from '@/lib/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function StaffManagerPage() {
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [copyMsg, setCopyMsg] = useState("")
  const [showQrModal, setShowQrModal] = useState(false)
  const [presenceCode, setPresenceCode] = useState("")
  const [qrExpiresAt, setQrExpiresAt] = useState<Date | null>(null)
  const [qrTimer, setQrTimer] = useState(0)
  
  // Edit & Delete Modal States
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)

  const filteredStaff = useMemo(() => {
    if (!searchQuery) return staffList
    
    const query = searchQuery.toLowerCase()
    return staffList.filter(
      (staff) =>
        staff.name.toLowerCase().includes(query) ||
        staff.staff_code.toLowerCase().includes(query) ||
        staff.role.toLowerCase().includes(query)
    )
  }, [staffList, searchQuery])

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

  useEffect(() => {
    const interval = setInterval(fetchStaff, POLLING_INTERVALS.SLOW)
    return () => clearInterval(interval)
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
    setSelectedStaff(null)
    showSuccess("Staff berhasil dihapus")
  }

  const handleEdit = (id: string) => {
    const staff = staffList.find(s => s.id === id)
    if (staff) {
      setSelectedStaff(staff)
      setShowEditModal(true)
    }
  }

  const handleSaveEdit = async (updatedStaff: Staff) => {
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
  }

  return (
    <div className="h-[calc(100vh-55px)] flex flex-col overflow-hidden">
      <section className="flex-shrink-0 px-4 md:px-6 pt-4 md:pt-6 bg-white border-b border-gray-200">
        <StaffManagerHeader
          title="Staff Manager"
          description="Kelola data staff, role, status, dan kode login."
          onGenerateQR={handleGenerateQrAndCode}
          onAddStaff={() => setShowAddModal(true)}
        >
          <ViewModeToggle
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari nama, ID, atau role..."
            width="w-full sm:w-64"
          />
        </StaffManagerHeader>
      </section>

      <section className="flex-1 overflow-y-auto bg-gray-100 px-4 md:px-6 py-4 md:py-6">
        {viewMode === 'card' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {filteredStaff.map((staff) => (
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
              staffList={filteredStaff}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onGeneratePass={handleGeneratePass}
              onCopyCode={handleCopy}
            />
          </div>
        )}

        {filteredStaff.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchQuery ? "Tidak ada staff yang ditemukan" : "Belum ada data staff"}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Clear search
              </button>
            )}
          </div>
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
