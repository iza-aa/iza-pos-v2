import { ActivityLogStats as Stats } from '@/lib/types'
import { OWNER_SEMANTIC_TONES, type OwnerSemanticTone } from '@/lib/constants/theme'
import { useLanguage } from '../../shared/i18n'

interface ActivityLogStatsProps {
  stats: Stats
}

export default function ActivityLogStats({ stats }: ActivityLogStatsProps) {
  const { t } = useLanguage()
  const cards: Array<{
    label: string
    value: string | number
    detail: string
    tone: OwnerSemanticTone
  }> = [
    {
      label: t('owner.activity.totalLogs'),
      value: stats.totalLogs,
      detail: t('owner.activity.totalLogsDetail'),
      tone: 'neutral',
    },
    {
      label: t('owner.activity.today'),
      value: stats.todayLogs,
      detail: t('owner.activity.todayDetail'),
      tone: 'info',
    },
    {
      label: t('owner.activity.critical'),
      value: stats.criticalActions,
      detail: t('owner.activity.criticalDetail'),
      tone: stats.criticalActions > 0 ? 'danger' : 'success',
    },
    {
      label: t('owner.activity.activeUsers'),
      value: stats.uniqueUsers,
      detail: t('owner.activity.activeUsersDetail'),
      tone: 'progress',
    },
    {
      label: t('owner.activity.topUser'),
      value: stats.topUser.name,
      detail: t('owner.activity.actions', { count: stats.topUser.count }),
      tone: 'premium',
    },
    {
      label: t('owner.activity.topAction'),
      value: stats.topAction.name,
      detail: t('owner.activity.times', { count: stats.topAction.count }),
      tone: 'coffee',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-2xl border p-4 shadow-sm ${OWNER_SEMANTIC_TONES[card.tone].cardClass}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{card.label}</p>
          <p className="mt-3 truncate text-2xl font-bold text-gray-950">
            {card.value}
          </p>
          <p className="mt-2 truncate text-sm leading-5 text-gray-600">{card.detail}</p>
        </div>
      ))}
    </div>
  )
}
