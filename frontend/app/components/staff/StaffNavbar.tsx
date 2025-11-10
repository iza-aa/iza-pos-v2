'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import RoleSelector from './RoleSelector'

type Role = 'Owner' | 'Staff' | 'Manager'
type Tab = 'pos' | 'order' | 'shift'

export default function StaffNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [currentRole, setCurrentRole] = useState<Role>('Staff')

  // Determine active tab based on current path
  const getActiveTab = (): Tab => {
    if (pathname.includes('/pos')) return 'pos'
    if (pathname.includes('/order')) return 'order'
    if (pathname.includes('/shift')) return 'shift'
    return 'pos' // default
  }

  const activeTab = getActiveTab()

  const tabs: { id: Tab; label: string; path: string }[] = [
    { id: 'pos', label: 'POS', path: '/staff/pos' },
    { id: 'order', label: 'Order', path: '/staff/order' },
    { id: 'shift', label: 'My Shift', path: '/staff/shift' },
  ]

  const handleTabClick = (tab: Tab, path: string) => {
    router.push(path)
  }

  const handleRoleChange = (role: Role) => {
    setCurrentRole(role)
    
    // Navigate to different dashboards based on role
    if (role === 'Owner') {
      router.push('/owner/dashboard')
    } else if (role === 'Manager') {
      router.push('/manager/products')
    } else {
      router.push('/staff/pos')
    }
  }

  return (
    <nav className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
      {/* Left: Role Selector + Tabs */}
      <div className="flex items-center gap-6">
        {/* Role Selector */}
        <RoleSelector currentRole={currentRole} onRoleChange={handleRoleChange} />

        {/* Tabs */}
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id, tab.path)}
              className="relative px-5 py-2 text-sm font-medium transition"
            >
              <span
                className={`${
                  activeTab === tab.id
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </span>

              {/* Blue Dot Indicator */}
              {activeTab === tab.id && (
                <div className="absolute -top-1 right-1/2 translate-x-1/2 w-1.5 h-1.5 bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Right: User Info (optional, for future) */}
      <div className="flex items-center gap-4">
        {/* You can add user profile, notifications, etc here */}
      </div>
    </nav>
  )
}
