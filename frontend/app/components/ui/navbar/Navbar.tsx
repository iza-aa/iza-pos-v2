'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { 
  BellIcon, 
  Bars3Icon, 
  XMarkIcon,
  ArrowsRightLeftIcon,
  HomeIcon,
  ChartBarIcon,
  UserIcon,
  CheckIcon,
  Squares2X2Icon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  QueueListIcon,
  CubeIcon,
  TagIcon,
  ArchiveBoxIcon,
  ShoppingCartIcon,
  FireIcon,
  TicketIcon
} from '@heroicons/react/24/outline'
import { 
  Squares2X2Icon as Squares2X2IconSolid,
  UserGroupIcon as UserGroupIconSolid,
  ClipboardDocumentListIcon as ClipboardDocumentListIconSolid,
  QueueListIcon as QueueListIconSolid,
  CubeIcon as CubeIconSolid,
  TagIcon as TagIconSolid,
  ArchiveBoxIcon as ArchiveBoxIconSolid,
  ShoppingCartIcon as ShoppingCartIconSolid,
  FireIcon as FireIconSolid,
  TicketIcon as TicketIconSolid
} from '@heroicons/react/24/solid'
import ProfilePopout from '../profile/page'

// ============ MENU CONFIGURATIONS ============
const menuConfig = {
  owner: [
    { label: 'Dashboard', path: '/owner/dashboard', icon: Squares2X2Icon, iconSolid: Squares2X2IconSolid },
    { label: 'Staff Manager', path: '/owner/staff-manager', icon: UserGroupIcon, iconSolid: UserGroupIconSolid },
    { label: 'Activity Log', path: '/owner/activitylog', icon: ClipboardDocumentListIcon, iconSolid: ClipboardDocumentListIconSolid },
  ],
  manager: [
    { label: 'Dashboard', path: '/manager/dashboard', icon: Squares2X2Icon, iconSolid: Squares2X2IconSolid },
    { label: 'Menu', path: '/manager/menu', icon: QueueListIcon, iconSolid: QueueListIconSolid },
    { label: 'Variants', path: '/manager/variants', icon: CubeIcon, iconSolid: CubeIconSolid },
    { label: 'Inventory', path: '/manager/inventory', icon: ArchiveBoxIcon, iconSolid: ArchiveBoxIconSolid },
    { label: 'Order', path: '/manager/order', icon: ShoppingCartIcon, iconSolid: ShoppingCartIconSolid },
  ],
  staff: {
    kitchen: [
      { label: 'Dashboard', path: '/staff/dashboard', icon: Squares2X2Icon, iconSolid: Squares2X2IconSolid },
      { label: 'Kitchen', path: '/staff/kitchen', icon: FireIcon, iconSolid: FireIconSolid },
    ],
    cashier: [
      { label: 'Dashboard', path: '/staff/dashboard', icon: Squares2X2Icon, iconSolid: Squares2X2IconSolid },
      { label: 'POS', path: '/staff/pos', icon: TicketIcon, iconSolid: TicketIconSolid },
    ],
    barista: [
      { label: 'Dashboard', path: '/staff/dashboard', icon: Squares2X2Icon, iconSolid: Squares2X2IconSolid },
      { label: 'POS', path: '/staff/pos', icon: TicketIcon, iconSolid: TicketIconSolid },
    ],
    waiter: [
      { label: 'Dashboard', path: '/staff/dashboard', icon: Squares2X2Icon, iconSolid: Squares2X2IconSolid },
      { label: 'Order', path: '/staff/order', icon: ShoppingCartIcon, iconSolid: ShoppingCartIconSolid },
    ],
  },
}

// Menu untuk Owner ketika mengakses fitur role lain (TANPA Dashboard)
const ownerAccessMenu = {
  manager: [
    { label: 'Menu', path: '/manager/menu', icon: QueueListIcon, iconSolid: QueueListIconSolid },
    { label: 'Variants', path: '/manager/variants', icon: CubeIcon, iconSolid: CubeIconSolid },
    { label: 'Inventory', path: '/manager/inventory', icon: ArchiveBoxIcon, iconSolid: ArchiveBoxIconSolid },
    { label: 'Order', path: '/manager/order', icon: ShoppingCartIcon, iconSolid: ShoppingCartIconSolid },
  ],
  staff: [
    { label: 'POS', path: '/staff/pos', icon: TicketIcon, iconSolid: TicketIconSolid },
    { label: 'Order', path: '/staff/order', icon: ShoppingCartIcon, iconSolid: ShoppingCartIconSolid },
    { label: 'Kitchen', path: '/staff/kitchen', icon: FireIcon, iconSolid: FireIconSolid },
  ],
}

const roleConfig = {
  owner: { label: 'Owner', icon: HomeIcon, color: 'text-orange-500' },
  manager: { label: 'Manager', icon: ChartBarIcon, color: 'text-blue-500' },
  staff: { label: 'Staff', icon: UserIcon, color: 'text-green-500' },
}

// ============ TYPES ============
type Role = 'owner' | 'manager' | 'staff'
type StaffType = 'kitchen' | 'cashier' | 'barista' | 'waiter'

interface NavbarProps {
  role: Role
  staffType?: StaffType | null
  canSwitchRole?: boolean
}

// ============ NAVBAR COMPONENT ============
export default function Navbar({ role, staffType, canSwitchRole = false }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const [mounted, setMounted] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showRoleDropdown, setShowRoleDropdown] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role>(role)
  const [userName, setUserName] = useState('User')

  useEffect(() => {
    setMounted(true)
    const name = localStorage.getItem('user_name') || 'User'
    setUserName(name)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRoleDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-sync selectedRole with pathname
  useEffect(() => {
    if (mounted && canSwitchRole) {
      const autoRole: Role = 
        pathname.startsWith('/staff') ? 'staff' :
        pathname.startsWith('/manager') ? 'manager' :
        'owner'
      setSelectedRole(autoRole)
    }
  }, [pathname, mounted, canSwitchRole])

  // Get menu items based on role
  const getMenuItems = () => {
    if (canSwitchRole) {
      if (selectedRole === 'staff') return ownerAccessMenu.staff
      if (selectedRole === 'manager') return ownerAccessMenu.manager
      return menuConfig.owner
    }
    
    if (role === 'staff' && staffType) {
      return menuConfig.staff[staffType] || menuConfig.staff.cashier
    }
    if (role === 'manager') return menuConfig.manager
    return menuConfig.owner
  }

  const navItems = getMenuItems()
  const activeTab = navItems.findIndex(item => 
    pathname === item.path || pathname.startsWith(item.path + '/')
  )

  const handleRoleSwitch = (newRole: Role) => {
    setSelectedRole(newRole)
    setShowRoleDropdown(false)
    
    if (newRole === 'owner') {
      router.push('/owner/dashboard')
    } else if (newRole === 'manager') {
      router.push(ownerAccessMenu.manager[0].path)
    } else {
      router.push(ownerAccessMenu.staff[0].path)
    }
  }

  const currentRoleConfig = roleConfig[selectedRole]
  const CurrentRoleIcon = currentRoleConfig.icon

  if (!mounted) return null

  return (
    <>
      <nav className="bg-white border-b border-gray-100 px-4 lg:px-6 sticky top-0 z-50">
        <div className="flex items-center justify-between h-14">
          {/* Left: Logo */}
          <div className="flex items-center">
            <img src="/logo/IZALogo2.png" alt="Logo" className="w-12 h-8 object-contain" />
          </div>

          {/* Center: Nav Items (Desktop) */}
          <div className="hidden md:flex items-center gap-0 absolute left-1/2 -translate-x-1/2">
            {navItems.map((item, idx) => {
              const Icon = activeTab === idx ? item.iconSolid : item.icon
              const isActive = activeTab === idx
              
              return (
                <button
                  key={item.label}
                  onClick={() => router.push(item.path)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                    isActive
                      ? 'text-gray-900 border-gray-900'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              )
            })}
          </div>

          {/* Right: Role Switcher, Bell & Avatar */}
          <div className="flex items-center gap-1">
            {/* Role Switcher (Only for Owner) - Icon only */}
            {canSwitchRole && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                  className="hidden md:flex p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
                  title="Switch Portal"
                >
                  <ArrowsRightLeftIcon className="w-5 h-5" />
                </button>

                {/* Dropdown Menu - Light theme with black accents */}
                {showRoleDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50 overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Switch Portal
                      </p>
                    </div>
                    {(Object.keys(roleConfig) as Role[]).map((r) => {
                      const config = roleConfig[r]
                      const Icon = config.icon
                      const isActive = selectedRole === r
                      
                      return (
                        <button
                          key={r}
                          onClick={() => handleRoleSwitch(r)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors ${
                            isActive 
                              ? 'bg-gray-100' 
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <Icon className={`w-5 h-5 ${isActive ? 'text-gray-900' : 'text-gray-400'}`} />
                          <span className={`flex-1 text-left text-sm ${
                            isActive ? 'font-semibold text-gray-900' : 'text-gray-600'
                          }`}>
                            {config.label}
                          </span>
                          {isActive && (
                            <CheckIcon className="w-4 h-4 text-gray-900" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Notification Bell */}
            <button className="hidden md:flex p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors">
              <BellIcon className="w-5 h-5" />
            </button>

            {/* Avatar with Name & Role */}
            <button 
              onClick={() => setShowProfile(true)}
              className="hidden md:flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <img 
                src="/avatar.jpg" 
                alt="Avatar" 
                className="w-9 h-9 rounded-full object-cover border-2 border-gray-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=e5e7eb&color=374151`
                }}
              />
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500 capitalize">{selectedRole}</p>
              </div>
            </button>

            {/* Mobile: Menu Button */}
            <button 
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {showMobileMenu ? (
                <XMarkIcon className="w-6 h-6 text-gray-700" />
              ) : (
                <Bars3Icon className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 top-[57px] bg-white z-40 overflow-y-auto">
          {/* Owner/Profile Section - Moved to Top */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-lg hover:bg-gray-100">
                <BellIcon className="w-5 h-5 text-gray-600" />
              </button>
              <button 
                onClick={() => {
                  setShowProfile(true)
                  setShowMobileMenu(false)
                }}
                className="flex items-center gap-3 flex-1 p-2 rounded-lg hover:bg-gray-100"
              >
                <img 
                  src="/avatar.jpg" 
                  alt="Avatar" 
                  className="w-9 h-9 rounded-full object-cover border-2 border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=User&background=f97316&color=fff'
                  }}
                />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">My Profile</p>
                  <p className="text-xs text-gray-500">View & edit profile</p>
                </div>
              </button>
            </div>
          </div>

          {/* Nav Items - Menu Section */}
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Menu
            </p>
            <div className="space-y-1">
              {navItems.map((item, idx) => {
                const Icon = activeTab === idx ? item.iconSolid : item.icon
                const isActive = activeTab === idx
                
                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      router.push(item.path)
                      setShowMobileMenu(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-gray-900 text-white font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Role Switcher for Mobile - Moved to Bottom */}
          {canSwitchRole && (
            <div className="px-4 py-3 bg-gray-50">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                Switch Portal
              </p>
              <div className="flex gap-2">
                {(Object.keys(roleConfig) as Role[]).map((r) => {
                  const config = roleConfig[r]
                  const Icon = config.icon
                  const isActive = selectedRole === r
                  
                  return (
                    <button
                      key={r}
                      onClick={() => {
                        handleRoleSwitch(r)
                        setShowMobileMenu(false)
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all border-b-2 ${
                        isActive 
                          ? 'bg-gray-100 text-gray-900 border-gray-900' 
                          : 'bg-white text-gray-500 border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {config.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Profile Popout */}
      {showProfile && (
        <ProfilePopout onClose={() => setShowProfile(false)} />
      )}
    </>
  )
}
