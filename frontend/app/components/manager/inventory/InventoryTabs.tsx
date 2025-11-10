'use client'

interface InventoryTabsProps {
  activeTab: 'raw-materials' | 'recipes' | 'usage-history'
  onTabChange: (tab: 'raw-materials' | 'recipes' | 'usage-history') => void
}

export default function InventoryTabs({ activeTab, onTabChange }: InventoryTabsProps) {
  const tabs = [
    { id: 'raw-materials' as const, label: 'Raw Materials', icon: '📦' },
    { id: 'recipes' as const, label: 'Recipes', icon: '📋' },
    { id: 'usage-history' as const, label: 'Usage History', icon: '📊' }
  ]

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="flex gap-1 px-8 pt-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 font-medium text-sm rounded-t-xl transition ${
              activeTab === tab.id
                ? 'bg-gray-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
