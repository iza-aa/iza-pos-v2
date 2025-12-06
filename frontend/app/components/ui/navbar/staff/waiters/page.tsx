'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { FiBell } from 'react-icons/fi'

export default function WaiterNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const tabs = [
    { label: 'Dashboard', path: '/staff/dashboard' },
    { label: 'Order', path: '/staff/order' },
  ]

  const activeTab = tabs.findIndex(tab => pathname === tab.path || pathname.startsWith(tab.path))

  if (!mounted) {
    return null
  }

  return (
    <nav className="bg-[#fafafa] border-b border-gray-200 px-4 py-3 flex items-center justify-between relative sticky top-0 z-50">
      {/* Left: Logo */}
      <div className="flex items-center">
        <img src="/logo/IZALogo2.png" alt="Logo" className="w-12 h-8 object-contain" />
      </div>

      {/* Center: Tabs */}
      <div className="flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
        {tabs.map((tab, idx) => (
          <button
            key={tab.label}
            onClick={() => router.push(tab.path)}
            className={`text-base transition font-medium ${
              activeTab === idx
                ? 'text-gray-900 font-bold'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Right: Notification + Avatar */}
      <div className="flex items-center gap-6">
        <FiBell className="w-5 h-5 text-gray-700 cursor-pointer" />
        <button>
          <img src="/avatar.jpg" alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
        </button>
      </div>
    </nav>
  )
}
