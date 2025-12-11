'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useSessionValidation } from '@/lib/useSessionValidation'
import { Bars3Icon } from '@heroicons/react/24/outline'
import InventoryTabs from '@/app/components/manager/inventory/InventoryTabs'
import RawMaterialsTab from '@/app/components/manager/inventory/rawmaterial/RawMaterialsTab'
import RecipesTab from '@/app/components/manager/inventory/recipe/RecipesTab'
import RecipeDishesTab from '@/app/components/manager/inventory/recipe/dishes'
import RecipeVariantsTab from '@/app/components/manager/inventory/recipe/variants'
import DefaultModifiersTab from '@/app/components/manager/inventory/recipe/modifiers'
import ProductOverridesTab from '@/app/components/manager/inventory/recipe/overrides'
import UsageHistoryTab from '@/app/components/manager/inventory/usagehistory/UsageHistoryTab'

type TabType = 'raw-materials' | 'recipes' | 'recipe-dishes' | 'recipe-variants' | 'default-modifiers' | 'product-overrides' | 'usage-history'

export default function InventoryPage() {
  useSessionValidation();
  
  const searchParams = useSearchParams()
  const viewAsOwner = searchParams.get('viewAs') === 'owner'
  const [activeTab, setActiveTab] = useState<TabType>('raw-materials')
  const [showSidebar, setShowSidebar] = useState(false)

  return (
    <div className="min-h-[calc(100vh-55px)] bg-gray-50 flex flex-col lg:flex-row h-[calc(100vh-55px)] overflow-hidden">
      {/* Floating Menu Button - Mobile Only */}
      <button
        onClick={() => setShowSidebar(true)}
        className="lg:hidden fixed bottom-6 left-6 w-14 h-14 bg-gray-900 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center text-white hover:scale-110 z-40"
      >
        <Bars3Icon className="w-6 h-6" />
      </button>

      {/* Backdrop - Mobile Only */}
      {showSidebar && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <InventoryTabs 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        showSidebar={showSidebar}
        onCloseSidebar={() => setShowSidebar(false)}
      />

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
