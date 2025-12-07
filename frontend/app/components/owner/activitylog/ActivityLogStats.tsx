import { ActivityLogStats as Stats } from '@/lib/activityTypes'

interface ActivityLogStatsProps {
  stats: Stats
}

export default function ActivityLogStats({ stats }: ActivityLogStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mt-4 md:mt-5">
      <div className="bg-white rounded-xl p-3 md:p-4 border border-gray-200">
        <div className="text-xs md:text-sm text-gray-600 mb-1">Total Logs</div>
        <div className="text-xl md:text-2xl font-bold text-gray-900">{stats.totalLogs}</div>
      </div>
      <div className="bg-white rounded-xl p-3 md:p-4 border border-gray-200">
        <div className="text-xs md:text-sm text-gray-600 mb-1">Today</div>
        <div className="text-xl md:text-2xl font-bold text-gray-800">{stats.todayLogs}</div>
      </div>
      <div className="bg-white rounded-xl p-3 md:p-4 border border-gray-200">
        <div className="text-xs md:text-sm text-gray-600 mb-1">Critical</div>
        <div className="text-xl md:text-2xl font-bold text-gray-800">{stats.criticalActions}</div>
      </div>
      <div className="bg-white rounded-xl p-3 md:p-4 border border-gray-200">
        <div className="text-xs md:text-sm text-gray-600 mb-1">Active Users</div>
        <div className="text-xl md:text-2xl font-bold text-gray-800">{stats.uniqueUsers}</div>
      </div>
      <div className="bg-white rounded-xl p-3 md:p-4 border border-gray-200">
        <div className="text-xs md:text-sm text-gray-600 mb-1">Top User</div>
        <div className="text-xs md:text-sm font-bold text-gray-900 truncate">{stats.topUser.name}</div>
        <div className="text-[10px] md:text-xs text-gray-500">{stats.topUser.count} actions</div>
      </div>
      <div className="bg-white rounded-xl p-3 md:p-4 border border-gray-200">
        <div className="text-xs md:text-sm text-gray-600 mb-1">Top Action</div>
        <div className="text-xs md:text-sm font-bold text-gray-900">{stats.topAction.name}</div>
        <div className="text-[10px] md:text-xs text-gray-500">{stats.topAction.count} times</div>
      </div>
    </div>
  )
}
