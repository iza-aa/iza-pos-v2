'use client'

import { useState } from 'react'
import { Package, ClipboardList, TrendingUp } from 'lucide-react'
import { XMarkIcon } from '@heroicons/react/24/outline'

type TabType = 'raw-materials' | 'recipes' | 'recipe-dishes' | 'recipe-variants' | 'default-modifiers' | 'product-overrides' | 'usage-history'

interface InventoryTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  showSidebar?: boolean
  onCloseSidebar?: () => void
}

export default function InventoryTabs({ activeTab, onTabChange, showSidebar = true, onCloseSidebar }: InventoryTabsProps) {
  const [isRecipeExpanded, setIsRecipeExpanded] = useState(false)
  
  const tabs = [
    { id: 'raw-materials' as const, label: 'Raw Materials', icon: Package },
    { id: 'recipes' as const, label: 'Recipes', icon: ClipboardList, hasSubmenu: true },
    { id: 'usage-history' as const, label: 'Usage History', icon: TrendingUp }
  ]

  const recipeSubTabs = [
    { id: 'recipe-dishes' as const, label: 'Dishes (Base Recipes)' },
    { id: 'recipe-variants' as const, label: 'Variants (Legacy)' },
    { id: 'default-modifiers' as const, label: 'Default Modifiers' },
    { id: 'product-overrides' as const, label: 'Product Overrides' }
  ]

  const isRecipeTabActive = activeTab === 'recipe-dishes' || activeTab === 'recipe-variants' || activeTab === 'default-modifiers' || activeTab === 'product-overrides'

  const handleTabClick = (tabId: TabType) => {
    if (tabId === 'recipes') {
      // Toggle dropdown instead of changing page
      setIsRecipeExpanded(!isRecipeExpanded)
    } else {
      onTabChange(tabId)
      setIsRecipeExpanded(false)
      if (onCloseSidebar) {
        onCloseSidebar() // Close sidebar on mobile when tab is selected
      }
    }
  }

  return (
    <section className={`w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 p-4 md:p-6 flex flex-col lg:h-full overflow-hidden
      lg:relative fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
      ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      {/* Close button - Mobile Only */}
      {onCloseSidebar && (
        <button
          onClick={onCloseSidebar}
          className="lg:hidden absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <XMarkIcon className="w-6 h-6 text-gray-600" />
        </button>
      )}

      <h2 className="text-base md:text-lg font-bold text-gray-900 mb-4 flex-shrink-0">Inventory</h2>
      
      <div className="space-y-1.5 flex-1 overflow-y-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.id === 'recipes' ? isRecipeTabActive : activeTab === tab.id
          
          return (
            <div key={tab.id}>
              <button
                onClick={() => handleTabClick(tab.id)}
                className={`w-full flex items-center px-2.5 py-2 rounded-lg transition group ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon 
                    className={`w-5 h-5 transition ${
                      isActive ? 'text-white' : 'text-gray-600'
                    }`}
                    strokeWidth={2}
                  />
                  <span className="text-sm font-medium">{tab.label}</span>
                </div>
              </button>
              
              {/* Submenu for Recipes */}
              {tab.hasSubmenu && isRecipeExpanded && (
                <div className="ml-8 mt-1 space-y-1">
                  {recipeSubTabs.map((subTab) => (
                    <button
                      key={subTab.id}
                      onClick={() => {
                        onTabChange(subTab.id)
                        if (onCloseSidebar) {
                          onCloseSidebar() // Close sidebar on mobile when sub-tab is selected
                        }
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${
                        activeTab === subTab.id
                          ? 'bg-gray-100 text-gray-900 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {subTab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
