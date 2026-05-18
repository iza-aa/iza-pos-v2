'use client'

import { useState } from 'react'
import { Bars3Icon } from '@heroicons/react/24/outline'
import { useSessionValidation } from '@/lib/hooks/useSessionValidation'
import InventoryTabs, { type InventoryTabType } from '@/app/components/manager/inventory/InventoryTabs'
import RawMaterialsTab from '@/app/components/manager/inventory/rawmaterial/RawMaterialsTab'
import RecipesTab from '@/app/components/manager/inventory/recipe/RecipesTab'
import RecipeDishesTab from '@/app/components/manager/inventory/recipe/dishes/baserecipe'
import ProductVariantRecipesTab from '@/app/components/manager/inventory/recipe/productvariantrecipe/ProductVariantRecipesTab'
import UsageHistoryTab from '@/app/components/manager/inventory/usagehistory/UsageHistoryTab'

export default function InventoryPage() {
  useSessionValidation()

  const [activeTab, setActiveTab] = useState<InventoryTabType>('raw-materials')
  const [showSidebar, setShowSidebar] = useState(false)

  return (
    <div className="flex h-[calc(100vh-55px)] min-h-[calc(100vh-55px)] flex-col overflow-hidden bg-gray-50 lg:flex-row">
      <button
        type="button"
        onClick={() => setShowSidebar(true)}
        className="fixed bottom-6 left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl lg:hidden"
        aria-label="Open inventory menu"
      >
        <Bars3Icon className="h-6 w-6" />
      </button>

      {showSidebar ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden"
          onClick={() => setShowSidebar(false)}
          aria-label="Close inventory menu overlay"
        />
      ) : null}

      <InventoryTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showSidebar={showSidebar}
        onCloseSidebar={() => setShowSidebar(false)}
      />

      <div className="flex-1 overflow-hidden">
        {activeTab === 'raw-materials' && <RawMaterialsTab />}
        {activeTab === 'recipes' && <RecipesTab />}
        {activeTab === 'recipe-dishes' && <RecipeDishesTab />}
        {activeTab === 'recipe-variants' && <ProductVariantRecipesTab />}
        {activeTab === 'usage-history' && <UsageHistoryTab />}
      </div>
    </div>
  )
}