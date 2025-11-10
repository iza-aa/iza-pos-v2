'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import InventoryTabs from './inventory/InventoryTabs'
import RawMaterialsTab from './inventory/RawMaterialsTab'
import RecipesTab from './inventory/RecipesTab'
import UsageHistoryTab from './inventory/UsageHistoryTab'

export default function InventoryManager() {
  const searchParams = useSearchParams()
  const viewAsOwner = searchParams.get('viewAs') === 'owner'
  const [activeTab, setActiveTab] = useState<'raw-materials' | 'recipes' | 'usage-history'>('raw-materials')

  return (
    <div className="h-[calc(100vh-64px)] bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <section className="flex-shrink-0 bg-white px-8 pt-8 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Inventory Management</h1>
          {viewAsOwner && (
            <span className="inline-block text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
              👁️ Viewing as Owner
            </span>
          )}
        </div>
      </section>

      {/* Tabs Navigation */}
      <InventoryTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'raw-materials' && <RawMaterialsTab viewAsOwner={viewAsOwner} />}
        {activeTab === 'recipes' && <RecipesTab viewAsOwner={viewAsOwner} />}
        {activeTab === 'usage-history' && <UsageHistoryTab viewAsOwner={viewAsOwner} />}
      </div>
    </div>
  )
}
