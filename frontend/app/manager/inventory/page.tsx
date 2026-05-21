'use client'

import { useState } from 'react'
import { useSessionValidation } from '@/lib/hooks/useSessionValidation'
import InventoryTabs, { type InventoryTabType } from '@/app/components/manager/inventory/InventoryTabs'
import RawMaterialsTab from '@/app/components/manager/inventory/rawmaterial/RawMaterialsTab'
import RecipeDishesTab from '@/app/components/manager/inventory/recipe/dishes/baserecipe'
import ProductVariantRecipesTab from '@/app/components/manager/inventory/recipe/productvariantrecipe/ProductVariantRecipesTab'
import UsageHistoryTab from '@/app/components/manager/inventory/usagehistory/UsageHistoryTab'
import VariantsTab from '@/app/components/manager/inventory/variants/VariantsTab'

export default function InventoryPage() {
  useSessionValidation()

  const [activeTab, setActiveTab] = useState<InventoryTabType>('raw-materials')

  return (
    <div className="flex h-[calc(100vh-55px)] min-h-[calc(100vh-55px)] flex-col overflow-hidden bg-gray-50 lg:flex-row">
      <InventoryTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="flex-1 overflow-hidden">
        {activeTab === 'raw-materials' && <RawMaterialsTab />}
        {activeTab === 'variants' && <VariantsTab />}
        {activeTab === 'recipe-dishes' && <RecipeDishesTab />}
        {activeTab === 'recipe-variants' && <ProductVariantRecipesTab />}
        {activeTab === 'usage-history' && <UsageHistoryTab />}
      </div>
    </div>
  )
}