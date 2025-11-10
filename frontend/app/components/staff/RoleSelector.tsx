'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

type Role = 'Owner' | 'Staff' | 'Manager'

interface RoleSelectorProps {
  currentRole: Role
  onRoleChange: (role: Role) => void
}

export default function RoleSelector({ currentRole, onRoleChange }: RoleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const roles: Role[] = ['Owner', 'Staff', 'Manager']

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleRoleClick = (role: Role) => {
    onRoleChange(role)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Current Role Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
      >
        <span className="text-sm font-medium text-gray-700">{currentRole}</span>
        <ChevronDownIcon 
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-xl shadow-lg py-2 min-w-[180px] z-50">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
            Switch Role
          </div>
          <div className="space-y-1 px-2">
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => handleRoleClick(role)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
                  currentRole === role
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
