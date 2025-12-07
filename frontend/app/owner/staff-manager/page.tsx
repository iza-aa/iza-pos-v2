"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@supabase/supabase-js"
import { QRCodeSVG } from "qrcode.react"
import { SearchBar, ViewModeToggle, DeleteModal } from "@/app/components/ui"
import { StaffCard, StaffTable, StaffManagerHeader, EditStaffModal } from "@/app/components/owner/staff-manager"
import type { ViewMode } from "@/app/components/ui/ViewModeToggle"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Staff {
  id: string
  staff_code: string
  name: string
  role: string
  phone: string
  status: string
  login_code?: string
  login_code_expires_at?: string
  created_at?: string
}

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
    const interval = setInterval(fetchStaff, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!showQrModal || !qrExpiresAt) return
    const interval = setInterval(() => {
      const sisa = Math.max(0, Math.floor((qrExpiresAt.getTime() - Date.now()) / 1000))
      setQrTimer(sisa)
      if (sisa <= 0) {
        setShowQrModal(false)
        setPresenceCode("")
        setQrExpiresAt(null)
      }
    }, 1000)
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
    setTimeout(() => setCopyMsg(""), 1500)
  }

  const handleGeneratePass = async (id: string) => {
    const res = await fetch(`/api/staff/${id}/generate-pass`, {
      method: "POST",
    })
    const result = await res.json()

    if (!res.ok) {
      alert(result.error || "Gagal generate kode")
      return
    }

    fetchStaff()
    alert("Kode login berhasil dikirim ke WhatsApp staff!")
  }

  const handleGenerateQrAndCode = async () => {
    if (!window.confirm("Generate QR and Code?")) return

    function generatePresenceCode() {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
      let code = ""
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return code
    }
    const presence_code = generatePresenceCode()
    const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString()

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
      alert("Gagal menghapus staff: " + error.message)
      return
    }

    fetchStaff()
    setShowDeleteModal(false)
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
    const { error } = await supabase
      .from("staff")
      .update({
        name: updatedStaff.name,
        role: updatedStaff.role,
        status: updatedStaff.status
      })
      .eq("id", updatedStaff.id)

    if (error) {
      alert("Gagal update staff: " + error.message)
      return
    }

    fetchStaff()
    setShowEditModal(false)
    setSelectedStaff(null)
  }

  return (
    <div className="h-[calc(100vh-55px)] flex flex-col overflow-hidden">
      <section className="flex-shrink-0 px-4 md:px-6 pt-4 md:pt-6 bg-white border-b border-gray-200">
        <StaffManagerHeader
          title="Staff Manager"
          description="Kelola data staff, role, status, dan kode login."
          onGenerateQR={handleGenerateQrAndCode}
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

      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 flex flex-col items-center relative max-w-sm w-full">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold"
              onClick={() => setShowQrModal(false)}
              title="Tutup"
            >
              ×
            </button>
            <div className="mb-4">
              <QRCodeSVG value={presenceCode} size={180} className="md:w-[200px] md:h-[200px]" />
            </div>
            <div className="text-base md:text-lg font-bold tracking-widest mb-2">{presenceCode}</div>
            <div className="text-gray-500 text-xs md:text-sm mb-2 text-center">
              Scan QR atau masukkan kode ini untuk presensi
            </div>
            {qrExpiresAt && (
              <div className="text-red-600 font-semibold text-xs md:text-sm">
                Kode akan expired dalam: {Math.floor(qrTimer / 60)}:{String(qrTimer % 60).padStart(2, "0")}
              </div>
            )}
          </div>
        </div>
      )}

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
