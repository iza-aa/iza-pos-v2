'use client'

import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { calculateVariantStats } from './helpers'

interface RecipeVariantsStatsProps {
  variantGroups: any[]
  recipes: any[]
  showStats: boolean
  onToggleStats: () => void
}

export default function RecipeVariantsStats({
  variantGroups,
  recipes,
  showStats,
  onToggleStats
}: RecipeVariantsStatsProps) {
  const stats = calculateVariantStats(variantGroups, recipes)

  const statsData = [
    {
      label: 'Total Variant Groups',
      value: variantGroups.length,
      bgColor: '#FFE5CC'
    },
    {
      label: 'Total Variant Options',
      value: stats.totalVariants,
      bgColor: '#E5F3FF'
    },
    {
      label: 'With Recipes',
      value: stats.variantsWithRecipes,
      bgColor: '#B2FF5E'
    },
    {
      label: 'Without Recipes',
      value: stats.variantsWithoutRecipes,
      bgColor: '#FF6859'
    },
    {
      label: 'Completion',
      value: `${stats.completionPercentage}%`,
      bgColor: '#E5CCFF'
    }
  ]

  return (
    <div className="mb-4">
      <button
        onClick={onToggleStats}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-2"
      >
        {showStats ? (
          <>
            <EyeSlashIcon className="w-4 h-4" />
            Hide Statistics
          </>
        ) : (
          <>
            <EyeIcon className="w-4 h-4" />
            Show Statistics
          </>
        )}
      </button>

      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {statsData.map((stat, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border border-gray-200"
              style={{ backgroundColor: stat.bgColor }}
            >
              <div className="text-sm text-gray-600 mb-1">{stat.label}</div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
