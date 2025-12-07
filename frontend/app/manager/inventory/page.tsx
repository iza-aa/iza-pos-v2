'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import InventoryTabs from '@/app/components/manager/inventory/InventoryTabs'
import RawMaterialsTab from '@/app/components/manager/inventory/rawmaterial/RawMaterialsTab'
import RecipesTab from '@/app/components/manager/inventory/recipe/RecipesTab'
import RecipeDishesTab from '@/app/components/manager/inventory/recipe/RecipeDishesTab'
import RecipeVariantsTab from '@/app/components/manager/inventory/recipe/RecipeVariantsTab'
import DefaultModifiersTab from '@/app/components/manager/inventory/recipe/DefaultModifiersTab'
import ProductOverridesTab from '@/app/components/manager/inventory/recipe/ProductOverridesTab'
import UsageHistoryTab from '@/app/components/manager/inventory/usagehistory/UsageHistoryTab'

type TabType = 'raw-materials' | 'recipes' | 'recipe-dishes' | 'recipe-variants' | 'default-modifiers' | 'product-overrides' | 'usage-history'

export default function InventoryPage() {
  const searchParams = useSearchParams()
  const viewAsOwner = searchParams.get('viewAs') === 'owner'
  const [activeTab, setActiveTab] = useState<TabType>('raw-materials')

  return (
    <div className="min-h-[calc(100vh-55px)] bg-gray-50 flex flex-col lg:flex-row h-[calc(100vh-55px)] overflow-hidden">
      {/* Sidebar Navigation */}
      <InventoryTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'raw-materials' && <RawMaterialsTab viewAsOwner={viewAsOwner} />}
        {activeTab === 'recipes' && <RecipesTab viewAsOwner={viewAsOwner} />}
        {activeTab === 'recipe-dishes' && <RecipeDishesTab viewAsOwner={viewAsOwner} />}
        {activeTab === 'recipe-variants' && <RecipeVariantsTab viewAsOwner={viewAsOwner} />}
        {activeTab === 'default-modifiers' && <DefaultModifiersTab viewAsOwner={viewAsOwner} />}
        {activeTab === 'product-overrides' && <ProductOverridesTab viewAsOwner={viewAsOwner} />}
        {activeTab === 'usage-history' && <UsageHistoryTab viewAsOwner={viewAsOwner} />}
      </div>
    </div>
  )
}
