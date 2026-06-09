'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, Package, TrendingUp, SlidersHorizontal, Layers, ChevronDown, ChevronRight, Menu, X, AlertTriangle } from 'lucide-react'
import { useLanguage } from '@/app/components/shared/i18n'

export type InventoryTabType =
  | 'raw-materials-list'
  | 'raw-materials-batches'
  | 'variants'
  | 'recipe-dishes'
  | 'recipe-variants'
  | 'usage-history'
  | 'stock-reports'

interface InventoryTabsProps {
  activeTab: InventoryTabType
  onTabChange: (tab: InventoryTabType) => void
}

export default function InventoryTabs({
  activeTab,
  onTabChange,
}: InventoryTabsProps) {
  const { t } = useLanguage()
  const [isRecipeExpanded, setIsRecipeExpanded] = useState(false)
  const [isRawMaterialsExpanded, setIsRawMaterialsExpanded] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const tabItems = [
    {
      id: 'raw-materials' as const,
      labelKey: 'manager.inventory.tabs.inventoryMaster',
      descriptionKey: 'manager.inventory.tabs.inventoryMasterDescription',
      icon: Package,
      hasSubmenu: true,
    },
    {
      id: 'variants' as const,
      labelKey: 'manager.inventory.tabs.variants',
      descriptionKey: 'manager.inventory.tabs.variantsDescription',
      icon: SlidersHorizontal,
    },
    {
      id: 'recipes' as const,
      labelKey: 'manager.inventory.tabs.recipes',
      descriptionKey: 'manager.inventory.tabs.recipesDescription',
      icon: ClipboardList,
      hasSubmenu: true,
    },
    {
      id: 'usage-history' as const,
      labelKey: 'manager.inventory.tabs.usageHistory',
      descriptionKey: 'manager.inventory.tabs.usageHistoryDescription',
      icon: TrendingUp,
    },
    {
      id: 'stock-reports' as const,
      labelKey: 'manager.inventory.tabs.stockReports',
      descriptionKey: 'manager.inventory.tabs.stockReportsDescription',
      icon: AlertTriangle,
    },
  ]

  const recipeSubTabs = [
    { id: 'recipe-dishes' as const, labelKey: 'manager.inventory.tabs.baseRecipes', icon: ClipboardList },
    { id: 'recipe-variants' as const, labelKey: 'manager.inventory.tabs.productVariantRecipes', icon: Layers },
  ]
  const rawMaterialsSubTabs = [
    { id: 'raw-materials-list' as const, labelKey: 'manager.inventory.tabs.inventoryMaster', icon: ClipboardList },
    { id: 'raw-materials-batches' as const, labelKey: 'manager.inventory.tabs.batchStock', icon: Layers },
  ]

  const isRecipeTabActive = activeTab === 'recipe-dishes' || activeTab === 'recipe-variants'
  const isRawMaterialsTabActive = activeTab === 'raw-materials-list' || activeTab === 'raw-materials-batches'

  useEffect(() => {
    if (isRecipeTabActive) {
      setIsRecipeExpanded(true)
    }
    if (isRawMaterialsTabActive) {
      setIsRawMaterialsExpanded(true)
    }
  }, [isRecipeTabActive, isRawMaterialsTabActive])

  const handleTabClick = (tabId: 'raw-materials' | 'variants' | 'recipes' | 'usage-history' | 'stock-reports') => {
    if (tabId === 'raw-materials') {
      setIsRawMaterialsExpanded((current) => !current)
      if (!isRawMaterialsTabActive) {
        onTabChange('raw-materials-list')
      }
      return
    }

    if (tabId === 'recipes') {
      setIsRecipeExpanded((current) => !current)
      // Automatically activate first sub-tab when parent is opened if not already on a sub-tab
      if (!isRecipeTabActive) {
        onTabChange('recipe-dishes')
      }
      return
    }

    onTabChange(tabId)
    setIsMobileOpen(false)
  }

  const handleRecipeSubTabClick = (tabId: 'recipe-dishes' | 'recipe-variants') => {
    onTabChange(tabId)
    setIsRecipeExpanded(true)
    setIsMobileOpen(false)
  }

  const handleRawMaterialsSubTabClick = (tabId: 'raw-materials-list' | 'raw-materials-batches') => {
    onTabChange(tabId)
    setIsRawMaterialsExpanded(true)
    setIsMobileOpen(false)
  }

  return (
    <>
      {/* Floating Navigation Button - Mobile Only */}
      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed bottom-6 left-6 w-14 h-14 bg-gray-900 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center text-white hover:scale-110 z-40"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Backdrop - Mobile Only */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar for Desktop and Mobile (Drawer) */}
      <aside
        className={`w-64 bg-white border-r border-gray-200 p-4 flex flex-col shrink-0 lg:h-full
        lg:relative fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Close button - Mobile Only */}
        <button
          type="button"
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>

        <h2 className="mb-4 text-lg font-bold text-gray-900">{t('manager.inventory.title')}</h2>

        <div className="space-y-2 flex-1 min-h-0 overflow-y-auto">
          {tabItems.map((item) => {
            const Icon = item.icon
            // Parent is considered active if exact match or if any sub-tab is active
            const isActiveParent =
              item.id === 'recipes'
                ? isRecipeTabActive
                : item.id === 'raw-materials'
                  ? isRawMaterialsTabActive
                  : activeTab === item.id
            const isExpanded =
              item.id === 'recipes'
                ? isRecipeExpanded
                : item.id === 'raw-materials'
                  ? isRawMaterialsExpanded
                  : false

            return (
              <div key={item.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full rounded-lg px-3 py-3 text-left transition ${
                    isActiveParent
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${isActiveParent ? 'text-white' : 'text-gray-600'}`} />
                      <div>
                        <p className="text-sm font-semibold">{t(item.labelKey)}</p>
                        <p
                          className={`mt-0.5 text-xs ${
                            isActiveParent ? 'text-gray-200' : 'text-gray-400'
                          }`}
                        >
                          {t(item.descriptionKey)}
                        </p>
                      </div>
                    </div>
                    {item.hasSubmenu && (
                      <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : ''}`}>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0" />
                        )}
                      </div>
                    )}
                  </div>
                </button>

                {item.id === 'raw-materials' && item.hasSubmenu && isRawMaterialsExpanded && (
                  <div className="ml-6 border-l border-gray-200 pl-3 py-1 space-y-1">
                    {rawMaterialsSubTabs.map((subTab) => {
                      const SubIcon = subTab.icon
                      const isSubActive = activeTab === subTab.id

                      return (
                        <button
                          key={subTab.id}
                          type="button"
                          onClick={() => handleRawMaterialsSubTabClick(subTab.id)}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                            isSubActive
                              ? 'bg-gray-100 text-gray-900 font-bold'
                              : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <SubIcon className={`h-3.5 w-3.5 ${isSubActive ? 'text-gray-900' : 'text-gray-400'}`} />
                          {t(subTab.labelKey)}
                        </button>
                      )
                    })}
                  </div>
                )}

                {item.id === 'recipes' && item.hasSubmenu && isRecipeExpanded && (
                  <div className="ml-6 border-l border-gray-200 pl-3 py-1 space-y-1">
                    {recipeSubTabs.map((subTab) => {
                      const SubIcon = subTab.icon
                      const isSubActive = activeTab === subTab.id

                      return (
                        <button
                          key={subTab.id}
                          type="button"
                          onClick={() => handleRecipeSubTabClick(subTab.id)}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                            isSubActive
                              ? 'bg-gray-100 text-gray-900 font-bold'
                              : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <SubIcon className={`h-3.5 w-3.5 ${isSubActive ? 'text-gray-900' : 'text-gray-400'}`} />
                          {t(subTab.labelKey)}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </aside>
    </>
  )
}
