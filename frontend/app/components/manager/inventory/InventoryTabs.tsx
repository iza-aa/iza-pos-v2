'use client'

import { useState } from 'react'
import { Package, ClipboardList, TrendingUp } from 'lucide-react'

type TabType = 'raw-materials' | 'recipes' | 'recipe-dishes' | 'recipe-variants' | 'usage-history'

interface InventoryTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export default function InventoryTabs({ activeTab, onTabChange }: InventoryTabsProps) {
  const [isRecipeExpanded, setIsRecipeExpanded] = useState(false)
  
  const tabs = [
    { id: 'raw-materials' as const, label: 'Raw Materials', icon: Package },
    { id: 'recipes' as const, label: 'Recipes', icon: ClipboardList, hasSubmenu: true },
    { id: 'usage-history' as const, label: 'Usage History', icon: TrendingUp }
  ]

  const recipeSubTabs = [
    { id: 'recipe-dishes' as const, label: 'Dishes (Base Recipes)' },
    { id: 'recipe-variants' as const, label: 'Variants (Variant-Specific Recipes)' }
  ]

  const isRecipeTabActive = activeTab === 'recipe-dishes' || activeTab === 'recipe-variants'

  const handleTabClick = (tabId: TabType) => {
    if (tabId === 'recipes') {
      // Toggle dropdown instead of changing page
      setIsRecipeExpanded(!isRecipeExpanded)
    } else {
      onTabChange(tabId)
      setIsRecipeExpanded(false)
    }
  }

  return (
    <section className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col overflow-hidden">
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex-shrink-0">Inventory</h2>
      
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
                    ? 'bg-gray-100 text-gray-900'
                    : 'hover:bg-gray-50 text-gray-600'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon 
                    className={`w-5 h-5 transition ${
                      isActive ? 'text-blue-500' : 'text-gray-600'
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
                      onClick={() => onTabChange(subTab.id)}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${
                        activeTab === subTab.id
                          ? 'bg-blue-50 text-blue-600 font-medium'
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
