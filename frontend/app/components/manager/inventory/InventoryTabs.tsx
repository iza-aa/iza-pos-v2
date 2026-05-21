'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, Package, TrendingUp, SlidersHorizontal, Layers, ChevronDown, ChevronRight } from 'lucide-react'

export type InventoryTabType =
  | 'raw-materials'
  | 'variants'
  | 'recipe-dishes'
  | 'recipe-variants'
  | 'usage-history'

interface InventoryTabsProps {
  activeTab: InventoryTabType
  onTabChange: (tab: InventoryTabType) => void
}

export default function InventoryTabs({
  activeTab,
  onTabChange,
}: InventoryTabsProps) {
  const [isRecipeExpanded, setIsRecipeExpanded] = useState(false)

  const tabItems = [
    {
      id: 'raw-materials' as const,
      label: 'Raw Materials',
      description: 'Ingredients & stock levels',
      icon: Package,
    },
    {
      id: 'variants' as const,
      label: 'Variants',
      description: 'Menu custom options',
      icon: SlidersHorizontal,
    },
    {
      id: 'recipes' as const,
      label: 'Recipes',
      description: 'Manage menu recipes',
      icon: ClipboardList,
      hasSubmenu: true,
    },
    {
      id: 'usage-history' as const,
      label: 'Usage History',
      description: 'Audits & stock movements',
      icon: TrendingUp,
    },
  ]

  const recipeSubTabs = [
    { id: 'recipe-dishes' as const, label: 'Dishes (Base Recipes)', icon: ClipboardList },
    { id: 'recipe-variants' as const, label: 'Product Variant Recipes', icon: Layers },
  ]

  const isRecipeTabActive = activeTab === 'recipe-dishes' || activeTab === 'recipe-variants'

  useEffect(() => {
    if (isRecipeTabActive) {
      setIsRecipeExpanded(true)
    }
  }, [isRecipeTabActive])

  const handleTabClick = (tabId: 'raw-materials' | 'variants' | 'recipes' | 'usage-history') => {
    if (tabId === 'recipes') {
      setIsRecipeExpanded((current) => !current)
      // Automatically activate first sub-tab when parent is opened if not already on a sub-tab
      if (!isRecipeTabActive) {
        onTabChange('recipe-dishes')
      }
      return
    }

    onTabChange(tabId)
  }

  const handleRecipeSubTabClick = (tabId: 'recipe-dishes' | 'recipe-variants') => {
    onTabChange(tabId)
    setIsRecipeExpanded(true)
  }

  return (
    <>
      {/* Desktop Sidebar: Left Navigation */}
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white p-4 lg:flex lg:flex-col">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Inventory</h2>

        <div className="space-y-2">
          {tabItems.map((item) => {
            const Icon = item.icon
            // Parent is considered active if exact match or if any sub-tab is active
            const isActiveParent = item.id === 'recipes' ? isRecipeTabActive : activeTab === item.id

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
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p
                          className={`mt-0.5 text-xs ${
                            isActiveParent ? 'text-gray-200' : 'text-gray-400'
                          }`}
                        >
                          {item.description}
                        </p>
                      </div>
                    </div>
                    {item.hasSubmenu && (
                      <div className={`transition-transform duration-200 ${isRecipeExpanded ? 'rotate-0' : ''}`}>
                        {isRecipeExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0" />
                        )}
                      </div>
                    )}
                  </div>
                </button>

                {item.hasSubmenu && isRecipeExpanded && (
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
                              ? 'bg-gray-100 text-gray-900 font-bold border-l-2 border-gray-900'
                              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <SubIcon className={`h-3.5 w-3.5 ${isSubActive ? 'text-gray-900' : 'text-gray-400'}`} />
                          {subTab.label}
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

      {/* Mobile Header: Horizontal Scrollable Tabs */}
      <div className="flex shrink-0 flex-col gap-2 border-b border-gray-200 bg-white p-3 lg:hidden">
        {/* Main tabs */}
        <div className="flex overflow-x-auto rounded-xl border border-gray-200 bg-white p-1 scrollbar-none">
          {tabItems.map((item) => {
            const isActiveParent = item.id === 'recipes' ? isRecipeTabActive : activeTab === item.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabClick(item.id)}
                className={`flex-none rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  isActiveParent
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>

        {/* Sub-tabs row - visible only when Recipes is expanded/active */}
        {isRecipeTabActive && (
          <div className="flex overflow-x-auto rounded-lg border border-gray-100 bg-gray-50 p-1 scrollbar-none">
            {recipeSubTabs.map((subTab) => {
              const isSubActive = activeTab === subTab.id

              return (
                <button
                  key={subTab.id}
                  type="button"
                  onClick={() => handleRecipeSubTabClick(subTab.id)}
                  className={`flex-none rounded-md px-3 py-1.5 text-[11px] font-bold transition ${
                    isSubActive
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                      : 'text-gray-500 hover:text-gray-950'
                  }`}
                >
                  {subTab.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}