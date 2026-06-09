import {
  ActivityAction,
  ActivityCategory,
  ActivityLogFilters as Filters,
  SeverityLevel,
  UserRole,
} from '@/lib/types'
import { useLanguage } from '@/app/components/shared/i18n'

interface ActivityLogFiltersProps {
  filters: Filters
  onFilterChange: (filters: Filters) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
  uniqueUsers: Array<{ id: string, name: string, role: UserRole }>
}

export default function ActivityLogFilters({ 
  filters, 
  onFilterChange, 
  onClearFilters,
  hasActiveFilters,
  uniqueUsers
}: ActivityLogFiltersProps) {
  const { t } = useLanguage()
  
  return (
    <div className="bg-gray-50 rounded-xl p-4 mt-6 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">{t("owner.activity.filterOptions")}</h3>
        {hasActiveFilters && (
          <button 
            onClick={onClearFilters}
            className="text-sm text-gray-700 hover:text-gray-900 font-medium"
          >
            {t("owner.activity.clearFilters")}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {/* Severity Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t("owner.activity.severity")}</label>
          <select 
            value={filters.severity || ''}
            onChange={(e) => onFilterChange({...filters, severity: (e.target.value || undefined) as SeverityLevel | undefined})}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="">{t("owner.activity.all")}</option>
            <option value="critical">{t("owner.activity.critical")}</option>
            <option value="warning">{t("owner.activity.warning")}</option>
            <option value="info">{t("owner.activity.info")}</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t("owner.activity.category")}</label>
          <select 
            value={filters.category || ''}
            onChange={(e) => onFilterChange({...filters, category: (e.target.value || undefined) as ActivityCategory | undefined})}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="">{t("owner.activity.all")}</option>
            <option value="AUTH">{t("owner.activity.authentication")}</option>
            <option value="SALES">{t("owner.activity.sales")}</option>
            <option value="INVENTORY">{t("owner.activity.inventory")}</option>
            <option value="MENU">{t("owner.activity.menu")}</option>
            <option value="STAFF">{t("owner.activity.staff")}</option>
            <option value="FINANCIAL">{t("owner.activity.financial")}</option>
            <option value="SYSTEM">{t("owner.activity.system")}</option>
            <option value="REPORT">{t("owner.activity.report")}</option>
          </select>
        </div>

        {/* Role Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t("owner.activity.userRole")}</label>
          <select 
            value={filters.userRole || ''}
            onChange={(e) => onFilterChange({...filters, userRole: (e.target.value || undefined) as UserRole | undefined})}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="">{t("owner.activity.all")}</option>
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="staff">{t("owner.activity.staff")}</option>
            <option value="cashier">Cashier</option>
          </select>
        </div>

        {/* Action Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">{t("owner.activity.actionType")}</label>
          <select 
            value={filters.action || ''}
            onChange={(e) => onFilterChange({...filters, action: (e.target.value || undefined) as ActivityAction | undefined})}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="">{t("owner.activity.all")}</option>
            <option value="CREATE">{t("owner.activity.create")}</option>
            <option value="UPDATE">{t("owner.activity.update")}</option>
            <option value="DELETE">{t("owner.activity.delete")}</option>
            <option value="LOGIN">{t("owner.activity.login")}</option>
            <option value="LOGOUT">{t("owner.activity.logout")}</option>
            <option value="VOID">{t("owner.activity.void")}</option>
            <option value="EXPORT">{t("owner.activity.export")}</option>
          </select>
        </div>

        {/* Specific User Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Specific User</label>
          <select 
            value={filters.userId || ''}
            onChange={(e) => onFilterChange({...filters, userId: e.target.value || undefined})}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="">{t("owner.activity.allUsers")}</option>
            {uniqueUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.role})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
