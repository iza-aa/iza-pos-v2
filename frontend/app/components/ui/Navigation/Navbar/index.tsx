'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/utils'
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
  ArchiveBoxIcon,
  ShoppingCartIcon,
  FireIcon,
  TicketIcon,
  ClockIcon,
  SquaresPlusIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'
import { 
  Squares2X2Icon as Squares2X2IconSolid,
  UserGroupIcon as UserGroupIconSolid,
  ClipboardDocumentListIcon as ClipboardDocumentListIconSolid,
  QueueListIcon as QueueListIconSolid,
  ArchiveBoxIcon as ArchiveBoxIconSolid,
  ShoppingCartIcon as ShoppingCartIconSolid,
  FireIcon as FireIconSolid,
  TicketIcon as TicketIconSolid,
  ClockIcon as ClockIconSolid,
  BanknotesIcon as BanknotesIconSolid
} from '@heroicons/react/24/solid'
import ProfilePopout from '../../../shared/profile/ProfileModal'
import { supabase } from '@/lib/config/supabaseClient'
import NotificationModal from '../../../shared/notifications/NotificationModal'
import type { AppNotification } from '../../../shared/notifications/types'
import useManagerNotifications from '../../../shared/notifications/useManagerNotifications'
import useOwnerNotifications from '../../../shared/notifications/useOwnerNotifications'
import useStaffNotifications from '../../../shared/notifications/useStaffNotifications'
import { useLanguage } from '../../../shared/i18n'
import type { TranslationKey } from '../../../shared/i18n'
import {
  getPrimaryStaffPosition,
  getStaffPositions,
  normalizeStaffPosition,
  normalizeStaffPositions,
  type StaffPosition,
  type StaffPositionAssignment,
} from '@/lib/staff/positions'

// ============ MENU CONFIGURATIONS ============
const menuConfig = {
  owner: [
    { label: 'Dashboard', labelKey: 'nav.owner.dashboard', path: '/owner/dashboard', icon: Squares2X2Icon, iconSolid: Squares2X2IconSolid },
    { label: 'Staff Manager', labelKey: 'nav.owner.staffManager', path: '/owner/staff-manager', icon: UserGroupIcon, iconSolid: UserGroupIconSolid },
    { label: 'Bookkeeping', labelKey: 'nav.owner.bookkeeping', path: '/owner/bookkeeping', icon: ArchiveBoxIcon, iconSolid: ArchiveBoxIconSolid },
    { label: 'Activity Log', labelKey: 'nav.owner.activityLog', path: '/owner/activitylog', icon: ClipboardDocumentListIcon, iconSolid: ClipboardDocumentListIconSolid },
  ],
  manager: [
    { label: 'Menu', labelKey: 'nav.manager.menu', path: '/manager/menu', icon: QueueListIcon, iconSolid: QueueListIconSolid },
    { label: 'Inventory', labelKey: 'nav.manager.inventory', path: '/manager/inventory', icon: ArchiveBoxIcon, iconSolid: ArchiveBoxIconSolid },
    { label: 'Closing', labelKey: 'nav.manager.closing', path: '/manager/closing', icon: BanknotesIcon, iconSolid: BanknotesIconSolid },
    { label: 'Order', labelKey: 'nav.manager.order', path: '/manager/order', icon: ShoppingCartIcon, iconSolid: ShoppingCartIconSolid },
    { label: 'Staff Manager', labelKey: 'nav.manager.staff', path: '/manager/staff-manager', icon: UserGroupIcon, iconSolid: UserGroupIconSolid },
    { label: 'Table', labelKey: 'nav.manager.table', path: '/manager/table-management', icon: SquaresPlusIcon, iconSolid: QueueListIconSolid },
  ],
  staff: {
    kitchen: [
      { label: 'Kitchen', labelKey: 'nav.staff.kitchen', path: '/staff/kitchen', icon: FireIcon, iconSolid: FireIconSolid },
      { label: 'Stock Check', labelKey: 'nav.staff.stockCheck', path: '/staff/stock-check', icon: ArchiveBoxIcon, iconSolid: ArchiveBoxIconSolid },
    ],
    cashier: [
      { label: 'POS', labelKey: 'nav.staff.pos', path: '/staff/pos', icon: TicketIcon, iconSolid: TicketIconSolid },
      { label: 'Order', labelKey: 'nav.staff.order', path: '/staff/order', icon: ShoppingCartIcon, iconSolid: ShoppingCartIconSolid },
    ],
    barista: [
      { label: 'Stock Check', labelKey: 'nav.staff.stockCheck', path: '/staff/stock-check', icon: ArchiveBoxIcon, iconSolid: ArchiveBoxIconSolid },
    ],
    waiter: [],
  },
}

const attendanceMenuItem = {
  label: 'Attendance',
  labelKey: 'nav.staff.attendance',
  path: '/staff/attendance',
  icon: ClockIcon,
  iconSolid: ClockIconSolid,
}

// Menu untuk Owner ketika mengakses fitur role lain (TANPA Dashboard)
const ownerAccessMenu = {
  manager: [
    { label: 'Menu', labelKey: 'nav.manager.menu', path: '/manager/menu', icon: QueueListIcon, iconSolid: QueueListIconSolid },
    { label: 'Inventory', labelKey: 'nav.manager.inventory', path: '/manager/inventory', icon: ArchiveBoxIcon, iconSolid: ArchiveBoxIconSolid },
    { label: 'Closing', labelKey: 'nav.manager.closing', path: '/manager/closing', icon: BanknotesIcon, iconSolid: BanknotesIconSolid },
    { label: 'Order', labelKey: 'nav.manager.order', path: '/manager/order', icon: ShoppingCartIcon, iconSolid: ShoppingCartIconSolid },
    { label: 'Staff Manager', labelKey: 'nav.manager.staff', path: '/manager/staff-manager', icon: UserGroupIcon, iconSolid: UserGroupIconSolid },
    { label: 'Table', labelKey: 'nav.manager.table', path: '/manager/table-management', icon: SquaresPlusIcon, iconSolid: QueueListIconSolid },
  ],
  staff: [
    { label: 'POS', labelKey: 'nav.staff.pos', path: '/staff/pos', icon: TicketIcon, iconSolid: TicketIconSolid },
    { label: 'Attendance', labelKey: 'nav.staff.attendance', path: '/staff/attendance', icon: ClockIcon, iconSolid: ClockIconSolid },
    { label: 'Order', labelKey: 'nav.staff.order', path: '/staff/order', icon: ShoppingCartIcon, iconSolid: ShoppingCartIconSolid },
    { label: 'Kitchen', labelKey: 'nav.staff.kitchen', path: '/staff/kitchen', icon: FireIcon, iconSolid: FireIconSolid },
    { label: 'Stock Check', labelKey: 'nav.staff.stockCheck', path: '/staff/stock-check', icon: ArchiveBoxIcon, iconSolid: ArchiveBoxIconSolid },
  ],
}

const roleConfig = {
  owner: { label: 'Owner', labelKey: 'role.owner', icon: HomeIcon, color: 'text-orange-500' },
  manager: { label: 'Manager', labelKey: 'role.manager', icon: ChartBarIcon, color: 'text-blue-500' },
  staff: { label: 'Staff', labelKey: 'role.staff', icon: UserIcon, color: 'text-green-500' },
}

// ============ TYPES ============
type Role = 'owner' | 'manager' | 'staff'
type StaffType = StaffPosition

interface StoredProfile {
  id: string
  name: string
  role: string
  staffCode: string
  staffType: string
  staffPositions: StaffPosition[]
  profilePicture: string
}

const EMPTY_NOTIFICATIONS: AppNotification[] = []

interface NavbarProfileRow {
  id: string
  name: string | null
  role: string | null
  staff_code: string | null
  staff_type: string | null
  staff_positions?: StaffPositionAssignment[] | null
  profile_picture: string | null
}

interface NavbarProps {
  role: Role
  staffType?: StaffType | null
  staffPositions?: StaffPosition[]
  canSwitchRole?: boolean
}


const getFallbackAvatar = (name: string) => {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || 'User',
  )}&background=e5e7eb&color=374151`;
};

const readStoredProfile = () => {
  if (typeof window === 'undefined') {
    return {
      id: '',
      name: 'User',
      role: '',
      staffCode: '',
      staffType: '',
      staffPositions: [],
      profilePicture: '',
    } satisfies StoredProfile;
  }

  const currentUser = getCurrentUser();

  let storedPositions: StaffPosition[] = []
  try {
    storedPositions = normalizeStaffPositions(
      JSON.parse(localStorage.getItem('staff_positions') || '[]'),
    )
  } catch {
    storedPositions = []
  }

  return {
    id: localStorage.getItem('user_id') || currentUser?.id || '',
    name: localStorage.getItem('user_name') || currentUser?.name || 'User',
    role: localStorage.getItem('user_role') || currentUser?.role || '',
    staffCode: localStorage.getItem('staff_code') || '',
    staffType: localStorage.getItem('staff_type') || '',
    staffPositions: storedPositions,
    profilePicture: localStorage.getItem('profile_picture') || '',
  } satisfies StoredProfile;
};

const writeStoredProfile = (profile: Partial<StoredProfile>) => {
  if (typeof window === 'undefined') return;

  if (profile.name !== undefined) localStorage.setItem('user_name', profile.name || 'User');
  if (profile.role !== undefined) localStorage.setItem('user_role', profile.role || '');
  if (profile.staffCode !== undefined) localStorage.setItem('staff_code', profile.staffCode || '');
  if (profile.staffType !== undefined) localStorage.setItem('staff_type', profile.staffType || '');
  if (profile.staffPositions !== undefined) {
    localStorage.setItem('staff_positions', JSON.stringify(profile.staffPositions));
  }
  if (profile.profilePicture !== undefined) {
    localStorage.setItem('profile_picture', profile.profilePicture || '');
  }
};

// ============ NAVBAR COMPONENT ============
export default function Navbar({
  role,
  staffType,
  staffPositions = [],
  canSwitchRole = false,
}: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { language, toggleLanguage, t } = useLanguage()
  
  const [mounted, setMounted] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showRoleDropdown, setShowRoleDropdown] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role>(role)
  const [userName, setUserName] = useState('User')
  const [storedUserRole, setStoredUserRole] = useState('')
  const [storedStaffCode, setStoredStaffCode] = useState('')
  const [storedStaffType, setStoredStaffType] = useState('')
  const [storedStaffPositions, setStoredStaffPositions] = useState<StaffPosition[]>([])
  const [profilePicture, setProfilePicture] = useState('')
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set())
  const ownerNotificationsEnabled = canSwitchRole || role === 'owner' || storedUserRole === 'owner'
  const managerNotificationsEnabled = !ownerNotificationsEnabled && (role === 'manager' || storedUserRole === 'manager')
  const configuredStaffPositions = normalizeStaffPositions(
    staffPositions.length > 0 ? staffPositions : storedStaffPositions,
  )
  const legacyStaffPosition = normalizeStaffPosition(staffType || storedStaffType)
  const effectiveStaffPositions =
    legacyStaffPosition && !configuredStaffPositions.includes(legacyStaffPosition)
      ? [legacyStaffPosition, ...configuredStaffPositions]
      : configuredStaffPositions
  const effectiveStaffType =
    getPrimaryStaffPosition({
      positions: effectiveStaffPositions,
      staff_type: staffType || storedStaffType,
    }) || null
  const staffNotificationsEnabled = !ownerNotificationsEnabled && !managerNotificationsEnabled && (role === 'staff' || storedUserRole === 'staff')
  const notificationStorageKey = ownerNotificationsEnabled
    ? 'owner_notification_read_ids'
    : managerNotificationsEnabled
      ? 'manager_notification_read_ids'
      : staffNotificationsEnabled
        ? `staff_${effectiveStaffType || 'general'}_notification_read_ids`
        : 'notification_read_ids'
  const ownerNotificationState = useOwnerNotifications(ownerNotificationsEnabled)
  const managerNotificationState = useManagerNotifications(managerNotificationsEnabled)
  const staffNotificationState = useStaffNotifications(staffNotificationsEnabled, effectiveStaffType)
  const notifications = ownerNotificationsEnabled
    ? ownerNotificationState.notifications
    : managerNotificationsEnabled
      ? managerNotificationState.notifications
      : staffNotificationsEnabled
        ? staffNotificationState.notifications
        : EMPTY_NOTIFICATIONS
  const notificationsLoading = ownerNotificationsEnabled
    ? ownerNotificationState.loading
    : managerNotificationsEnabled
      ? managerNotificationState.loading
      : staffNotificationsEnabled
        ? staffNotificationState.loading
        : false

  useEffect(() => {
    const syncProfileFromStorage = () => {
      const storedProfile = readStoredProfile()
      setUserName(storedProfile.name)
      setStoredUserRole(storedProfile.role)
      setStoredStaffCode(storedProfile.staffCode)
      setStoredStaffType(storedProfile.staffType)
      setStoredStaffPositions(storedProfile.staffPositions)
      setProfilePicture(storedProfile.profilePicture)
    }

    const syncProfileFromDatabase = async () => {
      const storedProfile = readStoredProfile()
      if (!storedProfile.id) return

      const { data, error } = await supabase
        .from('staff')
        .select('id, name, role, staff_code, staff_type, profile_picture, staff_positions(id, staff_id, position, is_primary, is_active)')
        .eq('id', storedProfile.id)
        .maybeSingle()

      if (error || !data) return

      const profile = data as NavbarProfileRow
      const profilePositions = getStaffPositions(profile)
      const primaryPosition = getPrimaryStaffPosition(profile)
      const nextProfile: StoredProfile = {
        id: profile.id,
        name: profile.name || storedProfile.name || 'User',
        role: profile.role || storedProfile.role || '',
        staffCode: profile.staff_code || '',
        staffType: primaryPosition || profile.staff_type || '',
        staffPositions: profilePositions,
        profilePicture: profile.profile_picture || '',
      }

      writeStoredProfile(nextProfile)
      setUserName(nextProfile.name)
      setStoredUserRole(nextProfile.role)
      setStoredStaffCode(nextProfile.staffCode)
      setStoredStaffType(nextProfile.staffType)
      setStoredStaffPositions(nextProfile.staffPositions)
      setProfilePicture(nextProfile.profilePicture)
    }

    setMounted(true)
    syncProfileFromStorage()
    void syncProfileFromDatabase()

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || ['user_name', 'user_role', 'staff_code', 'staff_type', 'staff_positions', 'profile_picture'].includes(event.key)) {
        syncProfileFromStorage()
      }
    }

    const handleProfileUpdated = () => {
      syncProfileFromStorage()
      void syncProfileFromDatabase()
    }
    const handleFocus = () => {
      syncProfileFromStorage()
      void syncProfileFromDatabase()
    }
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        syncProfileFromStorage()
        void syncProfileFromDatabase()
      }
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('profile:updated', handleProfileUpdated)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('profile:updated', handleProfileUpdated)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedReadNotifications = localStorage.getItem(notificationStorageKey)
    if (!storedReadNotifications) {
      setReadNotificationIds(new Set())
      return
    }

    try {
      const parsed = JSON.parse(storedReadNotifications)
      setReadNotificationIds(
        Array.isArray(parsed)
          ? new Set(parsed.filter((item) => typeof item === 'string'))
          : new Set(),
      )
    } catch {
      setReadNotificationIds(new Set())
    }
  }, [notificationStorageKey])

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
    
    if (role === 'staff') {
      const orderedPositions: StaffPosition[] = ['cashier', 'kitchen', 'barista', 'waiter']
      const paths = new Set<string>()
      const items = orderedPositions
        .filter((position) => effectiveStaffPositions.includes(position))
        .flatMap((position) => menuConfig.staff[position])
        .filter((item) => {
          if (paths.has(item.path)) return false
          paths.add(item.path)
          return true
        })

      return [...items, attendanceMenuItem]
    }
    if (role === 'manager') return menuConfig.manager
    return menuConfig.owner
  }

  const navItems = getMenuItems()
  const activeTab = navItems.findIndex(item => 
    pathname === item.path || pathname.startsWith(item.path + '/')
  )
  const unreadNotificationCount = useMemo(
    () => notifications.filter((notification) => !readNotificationIds.has(notification.id)).length,
    [notifications, readNotificationIds],
  )

  const avatarSrc = profilePicture || getFallbackAvatar(userName)
  const visibleRoleLabel = storedUserRole || selectedRole
  const visibleRoleText = visibleRoleLabel === 'owner' || visibleRoleLabel === 'manager' || visibleRoleLabel === 'staff'
    ? t(roleConfig[visibleRoleLabel].labelKey as TranslationKey)
    : visibleRoleLabel
  const languageFlagSrc = language === 'en' ? '/logo/IDFLAG.png' : '/logo/UKFLAG.png'
  const languageFlagAlt = language === 'en' ? 'Switch to Indonesian' : 'Switch to English'
  const getItemLabel = (item: { label: string; labelKey?: string }) => (
    item.labelKey ? t(item.labelKey as TranslationKey) : item.label
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

  const persistReadNotificationIds = (nextIds: Set<string>) => {
    setReadNotificationIds(nextIds)
    if (typeof window !== 'undefined') {
      localStorage.setItem(notificationStorageKey, JSON.stringify(Array.from(nextIds)))
    }
  }

  const markNotificationRead = (id: string) => {
    persistReadNotificationIds(new Set([...Array.from(readNotificationIds), id]))
  }

  const markAllNotificationsRead = () => {
    persistReadNotificationIds(new Set(notifications.map((notification) => notification.id)))
  }

  const renderNotificationBadge = () => (
    unreadNotificationCount > 0 ? (
      <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
        {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
      </span>
    ) : null
  )


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
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? 'text-gray-900 border-gray-900'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {getItemLabel(item)}
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
                  title={t('nav.switchPortal')}
                >
                  <ArrowsRightLeftIcon className="w-5 h-5" />
                </button>

                {/* Dropdown Menu - Light theme with black accents */}
                {showRoleDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50 overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                        {t('nav.switchPortal')}
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
                            {t(config.labelKey as TranslationKey)}
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

            <button
              type="button"
              onClick={toggleLanguage}
              className="hidden md:flex items-center justify-center rounded-full border border-gray-200 bg-white transition hover:bg-gray-100"
              title={t('common.language')}
              aria-label={t('common.language')}
            >
              <Image
                src={languageFlagSrc}
                alt={languageFlagAlt}
                width={28}
                height={28}
                className="h-7 w-7 rounded-full object-cover"
              />
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => setShowNotifications(true)}
              className="relative hidden md:flex p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label={t('notifications.open')}
            >
              <BellIcon className="w-5 h-5" />
              {ownerNotificationsEnabled || managerNotificationsEnabled || staffNotificationsEnabled ? renderNotificationBadge() : null}
            </button>

            {/* Avatar with Name & Role */}
            <button 
              onClick={() => setShowProfile(true)}
              className="hidden md:flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <img 
                key={avatarSrc}
                src={avatarSrc} 
                alt="Avatar" 
                className="w-9 h-9 rounded-full object-cover border-2 border-gray-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getFallbackAvatar(userName)
                }}
              />
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500 capitalize">{visibleRoleText}</p>
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
        <div className="md:hidden fixed inset-0 top-14.25 bg-white z-40 overflow-y-auto">
          {/* Owner/Profile Section - Moved to Top */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowNotifications(true)
                  setShowMobileMenu(false)
                }}
                className="relative p-2 rounded-lg hover:bg-gray-100"
                aria-label={t('notifications.open')}
              >
                <BellIcon className="w-5 h-5 text-gray-600" />
                {ownerNotificationsEnabled || managerNotificationsEnabled || staffNotificationsEnabled ? renderNotificationBadge() : null}
              </button>
              <button 
                onClick={() => {
                  setShowProfile(true)
                  setShowMobileMenu(false)
                }}
                className="flex items-center gap-3 flex-1 p-2 rounded-lg hover:bg-gray-100"
              >
                <img 
                  key={`mobile-${avatarSrc}`}
                  src={avatarSrc} 
                  alt="Avatar" 
                  className="w-9 h-9 rounded-full object-cover border-2 border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getFallbackAvatar(userName)
                  }}
                />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">{userName}</p>
                  <p className="text-xs text-gray-500 capitalize">{visibleRoleText}{storedStaffCode ? ` • ${storedStaffCode}` : ''}</p>
                </div>
              </button>
              <button
                type="button"
                onClick={toggleLanguage}
                className="flex h-10 w-12 items-center justify-center rounded-lg border border-gray-200 bg-white"
                aria-label={t('common.language')}
              >
                <Image
                  src={languageFlagSrc}
                  alt={languageFlagAlt}
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-full object-cover"
                />
              </button>
            </div>
          </div>

          {/* Nav Items - Menu Section */}
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              {t('nav.menu')}
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
                    {getItemLabel(item)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Role Switcher for Mobile - Moved to Bottom */}
          {canSwitchRole && (
            <div className="px-4 py-3 bg-gray-50">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                {t('nav.switchPortal')}
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
                      {t(config.labelKey as TranslationKey)}
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

      {(ownerNotificationsEnabled || managerNotificationsEnabled || staffNotificationsEnabled) && (
        <NotificationModal
          open={showNotifications}
          notifications={notifications}
          readIds={readNotificationIds}
          loading={notificationsLoading}
          onClose={() => setShowNotifications(false)}
          onMarkAllRead={markAllNotificationsRead}
          onMarkRead={markNotificationRead}
        />
      )}
    </>
  )
}
