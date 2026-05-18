'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, Package, TrendingUp } from 'lucide-react'
import { XMarkIcon } from '@heroicons/react/24/outline'

export type InventoryTabType =
  | 'raw-materials'
  | 'recipes'
  | 'recipe-dishes'
  | 'recipe-variants'
  | 'usage-history'

interface InventoryTabsProps {
  activeTab: InventoryTabType
  onTabChange: (tab: InventoryTabType) => void
  showSidebar?: boolean
  onCloseSidebar?: () => void
}

export default function InventoryTabs({
  activeTab,
  onTabChange,
  showSidebar = true,
  onCloseSidebar,
}: InventoryTabsProps) {
  const [isRecipeExpanded, setIsRecipeExpanded] = useState(false)

  const tabs = [
    { id: 'raw-materials' as const, label: 'Raw Materials', icon: Package },
    { id: 'recipes' as const, label: 'Recipes', icon: ClipboardList, hasSubmenu: true },
    { id: 'usage-history' as const, label: 'Usage History', icon: TrendingUp },
  ]

  const recipeSubTabs = [
    { id: 'recipe-dishes' as const, label: 'Dishes (Base Recipes)' },
    { id: 'recipe-variants' as const, label: 'Product Variant Recipes' },
  ]

  const isRecipeTabActive = activeTab === 'recipe-dishes' || activeTab === 'recipe-variants'

  useEffect(() => {
    if (isRecipeTabActive) {
      setIsRecipeExpanded(true)
    }
  }, [isRecipeTabActive])

  const handleTabClick = (tabId: InventoryTabType) => {
    if (tabId === 'recipes') {
      setIsRecipeExpanded((current) => !current)
      return
    }

    onTabChange(tabId)
    setIsRecipeExpanded(false)
    onCloseSidebar?.()
  }

  const handleRecipeSubTabClick = (tabId: 'recipe-dishes' | 'recipe-variants') => {
    onTabChange(tabId)
    setIsRecipeExpanded(true)
    onCloseSidebar?.()
  }

  return (
    <section
      className={`fixed inset-y-0 left-0 z-50 flex w-full transform flex-col overflow-hidden border-b border-gray-200 bg-white p-4 transition-transform duration-300 ease-in-out md:p-6 lg:relative lg:h-full lg:w-64 lg:translate-x-0 lg:border-b-0 lg:border-r ${
        showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      {onCloseSidebar ? (
        <button
          type="button"
          onClick={onCloseSidebar}
          className="absolute right-4 top-4 rounded-lg p-2 transition hover:bg-gray-100 lg:hidden"
          aria-label="Close inventory menu"
        >
          <XMarkIcon className="h-6 w-6 text-gray-600" />
        </button>
      ) : null}

      <h2 className="mb-4 shrink-0 text-base font-bold text-gray-900 md:text-lg">
        Inventory
      </h2>

      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.id === 'recipes' ? isRecipeTabActive : activeTab === tab.id

          return (
            <div key={tab.id}>
              <button
                type="button"
                onClick={() => handleTabClick(tab.id)}
                className={`flex w-full items-center rounded-lg px-2.5 py-2 transition ${
                  isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                  <span className="text-sm font-medium">{tab.label}</span>
                </div>
              </button>

              {tab.hasSubmenu && isRecipeExpanded ? (
                <div className="ml-8 mt-1 space-y-1">
                  {recipeSubTabs.map((subTab) => (
                    <button
                      key={subTab.id}
                      type="button"
                      onClick={() => handleRecipeSubTabClick(subTab.id)}
                      className={`w-full rounded-lg px-4 py-2 text-left text-sm transition ${
                        activeTab === subTab.id
                          ? 'bg-gray-100 font-medium text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {subTab.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}