"use client"

import { useState, useEffect, useMemo } from "react"
import { useSessionValidation } from "@/lib/useSessionValidation"
import { getCurrentUser } from "@/lib/authUtils"
import { EXPIRATION_TIMES, TIMEOUT_DURATIONS } from "@/lib/timeConstants"
import { supabase } from "@/lib/supabaseClient"
import { SearchBar, ViewModeToggle } from "@/app/components/ui"
import { StaffCard, StaffTable } from "@/app/components/shared"
import type { ViewMode } from "@/app/components/ui/Form/ViewModeToggle"
import type { Staff } from "@/lib/types"

export default function ManagerStaffPage() {
  useSessionValidation()
  
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [copyMsg, setCopyMsg] = useState("")

  const filteredStaff = useMemo(() => {
    if (!searchQuery) return staffList
    
    const query = searchQuery.toLowerCase()
    return staffList.filter(
      (staff) =>
        staff.name.toLowerCase().includes(query) ||
        staff.staff_code.toLowerCase().includes(query) ||
        staff.role.toLowerCase().includes(query) ||
        (staff.staff_type && staff.staff_type.toLowerCase().includes(query))
    )
  }, [staffList, searchQuery])

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
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Staff Management
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            View staff list and generate login codes
          </p>
        </div>

        {/* Search & View Mode */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari staff..."
            />
          </div>
          <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {/* Staff List - Card View */}
        {viewMode === 'card' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStaff.map((staff) => (
              <StaffCard
                key={staff.id}
                staff={staff}
                onEdit={() => {}} // Manager can't edit
                onDelete={() => {}} // Manager can't delete
                onGeneratePass={() => handleGeneratePass(staff.id)}
                onCopyCode={handleCopyCode}
                showActions={false} // Hide Edit/Delete for manager
              />
            ))}
          </div>
        )}

        {/* Staff List - Table View */}
        {viewMode === 'table' && (
          <StaffTable
            staffList={filteredStaff}
            onEdit={() => {}} // Manager can't edit
            onDelete={() => {}} // Manager can't delete
            onGeneratePass={handleGeneratePass}
            onCopyCode={handleCopyCode}
            showActions={false} // Hide Edit/Delete for manager
          />
        )}

        {/* Empty State */}
        {filteredStaff.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Tidak ada staff ditemukan
            </h3>
            <p className="text-gray-600">
              {searchQuery ? 'Coba ubah kata kunci pencarian' : 'Belum ada staff terdaftar'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
