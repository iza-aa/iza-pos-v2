'use client'

import { useState } from 'react'
import RecipeDishesTab from './RecipeDishesTab'
import RecipeVariantsTab from './RecipeVariantsTab'

interface RecipesTabProps {
  viewAsOwner: boolean
}

export default function RecipesTab({ viewAsOwner }: RecipesTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'dishes' | 'variants'>('dishes')

  return (
    <div className="space-y-6">
      {/* Sub-tabs Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab('dishes')}
            className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeSubTab === 'dishes'
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span>🍽️</span>
              <span>Dishes (Base Recipes)</span>
            </div>
          </button>
          <button
            onClick={() => setActiveSubTab('variants')}
            className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeSubTab === 'variants'
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span>🔀</span>
              <span>Variants (Variant-Specific Recipes)</span>
            </div>
          </button>
        </div>
      </div>

      {/* Sub-tab Content */}
      {activeSubTab === 'dishes' && <RecipeDishesTab viewAsOwner={viewAsOwner} />}
      {activeSubTab === 'variants' && <RecipeVariantsTab viewAsOwner={viewAsOwner} />}
    </div>
  )
}
