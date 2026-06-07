'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSessionValidation } from '@/lib/hooks/useSessionValidation'
import InventoryTabs, { type InventoryTabType } from '@/app/components/manager/inventory/InventoryTabs'
import RawMaterialsTab from '@/app/components/manager/inventory/rawmaterial/RawMaterialsTab'
import RecipeDishesTab from '@/app/components/manager/inventory/recipe/dishes/baserecipe'
import ProductVariantRecipesTab from '@/app/components/manager/inventory/recipe/productvariantrecipe/ProductVariantRecipesTab'
import UsageHistoryTab from '@/app/components/manager/inventory/usagehistory/UsageHistoryTab'
import VariantsTab from '@/app/components/manager/inventory/variants/VariantsTab'
import StockReportsTab from '@/app/components/manager/inventory/stockreports/StockReportsTab'

export default function InventoryPage() {
  useSessionValidation()
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState<InventoryTabType>('raw-materials-list')
  const requestedTab = searchParams.get('tab') as InventoryTabType | null

  useEffect(() => {
    const validTabs: InventoryTabType[] = [
      'raw-materials-list',
      'raw-materials-batches',
      'variants',
      'recipe-dishes',
      'recipe-variants',
      'usage-history',
      'stock-reports',
    ]

    if (requestedTab && validTabs.includes(requestedTab)) {
      setActiveTab(requestedTab)
    }
  }, [requestedTab])

  return (
    <div className="flex h-[calc(100vh-55px)] min-h-[calc(100vh-55px)] flex-col overflow-hidden bg-gray-50 lg:flex-row">
      <InventoryTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'raw-materials-list' && <RawMaterialsTab view="raw-materials" />}
        {activeTab === 'raw-materials-batches' && <RawMaterialsTab view="batch-stock" />}
        {activeTab === 'variants' && <VariantsTab />}
        {activeTab === 'recipe-dishes' && <RecipeDishesTab />}
        {activeTab === 'recipe-variants' && <ProductVariantRecipesTab />}
        {activeTab === 'usage-history' && <UsageHistoryTab />}
        {activeTab === 'stock-reports' && <StockReportsTab />}
      </div>
    </div>
  )
}
