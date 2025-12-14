import { ActivityLogFilters as Filters, UserRole } from '@/lib/activityTypes'

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
  
  return (
    <div className="bg-gray-50 rounded-xl p-4 mt-6 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Filter Options</h3>
        {hasActiveFilters && (
          <button 
            onClick={onClearFilters}
            className="text-sm text-gray-700 hover:text-gray-900 font-medium"
          >
            Clear All
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {/* Severity Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Severity</label>
          <select 
            value={filters.severity || ''}
            onChange={(e) => onFilterChange({...filters, severity: e.target.value as any || undefined})}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="">All</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
          <select 
            value={filters.category || ''}
            onChange={(e) => onFilterChange({...filters, category: e.target.value as any || undefined})}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="">All</option>
            <option value="AUTH">Authentication</option>
            <option value="SALES">Sales</option>
            <option value="INVENTORY">Inventory</option>
            <option value="MENU">Menu</option>
            <option value="STAFF">Staff</option>
            <option value="FINANCIAL">Financial</option>
            <option value="SYSTEM">System</option>
            <option value="REPORT">Report</option>
          </select>
        </div>

        {/* Role Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">User Role</label>
          <select 
            value={filters.userRole || ''}
            onChange={(e) => onFilterChange({...filters, userRole: e.target.value as any || undefined})}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="">All</option>
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
            <option value="cashier">Cashier</option>
          </select>
        </div>

        {/* Action Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Action Type</label>
          <select 
            value={filters.action || ''}
            onChange={(e) => onFilterChange({...filters, action: e.target.value as any || undefined})}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="">All</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
            <option value="VOID">Void</option>
            <option value="EXPORT">Export</option>
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
            <option value="">All Users</option>
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
