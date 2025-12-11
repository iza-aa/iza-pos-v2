'use client'

import { ChevronDownIcon, ChevronUpIcon, PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline'

interface VariantOption {
  id: string
  name: string
  price_modifier: number
}

interface VariantGroup {
  id: string
  name: string
  options: VariantOption[]
}

interface RecipeIngredient {
  inventory_item_id: string
  ingredient_name: string
  quantity_needed: number
  unit: string
}

interface VariantRecipe {
  variant_option_id: string
  ingredients: RecipeIngredient[]
}

interface RawMaterial {
  id: string
  name: string
}

interface RecipeVariantsTableViewProps {
  variantGroups: VariantGroup[]
  recipes: VariantRecipe[]
  rawMaterials: RawMaterial[]
  expandedGroups: Set<string>
  onToggleGroup: (groupId: string) => void
  onOpenAddModal: (groupId: string, groupName: string, optionId: string, optionName: string) => void
  onOpenEditModal: (optionId: string, index: number, ingredient: RecipeIngredient) => void
  onRemoveIngredient: (optionId: string, index: number) => void
  getRecipeForOption: (optionId: string) => VariantRecipe | undefined
  formatPriceModifier: (modifier: number) => string
}

export default function RecipeVariantsTableView({
  variantGroups,
  recipes,
  rawMaterials,
  expandedGroups,
  onToggleGroup,
  onOpenAddModal,
  onOpenEditModal,
  onRemoveIngredient,
  getRecipeForOption,
  formatPriceModifier
}: RecipeVariantsTableViewProps) {
  
  // Group options with their recipes
  const groupedOptions = variantGroups.map(group => ({
    ...group,
    options: group.options.map((opt: any) => ({
      ...opt,
      groupId: group.id,
      groupName: group.name,
      recipe: getRecipeForOption(opt.id)
    }))
  }))

  if (groupedOptions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No variant options found</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Variant Group
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/5">
              Option Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/5">
              Price Modifier
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/5">
              Recipe Status
            </th>
            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/5">
              Ingredients
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {groupedOptions.map((group) => 
            group.options.map((option: any, idx: number) => {
              const hasRecipe = !!option.recipe
              const isExpanded = expandedGroups.has(option.id)

              return (
                <tr key={option.id} className="hover:bg-gray-50">
                  {idx === 0 && (
                    <td 
                      rowSpan={group.options.length} 
                      className="px-6 py-4 text-sm text-gray-900 font-bold bg-gray-50 border-r border-gray-200 align-top"
                    >
                      {option.groupName}
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {option.name}
                  </td>
                  <td className="px-6 py-4">
                    <span 
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-gray-900"
                      style={{
                        backgroundColor: option.price_modifier >= 0 ? '#B2FF5E' : '#FF6859'
                      }}
                    >
                      {formatPriceModifier(option.price_modifier)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span 
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border text-gray-900"
                      style={{
                        borderColor: hasRecipe && option.recipe!.ingredients.length > 0 ? '#B2FF5E' : '#FF6859',
                        backgroundColor: 'white'
                      }}
                    >
                      {hasRecipe && option.recipe!.ingredients.length > 0 
                        ? `${option.recipe!.ingredients.length} ingredient${option.recipe!.ingredients.length !== 1 ? 's' : ''}` 
                        : 'No Recipe'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2 flex flex-col items-center">
                      {/* Toggle Button */}
                      {!isExpanded && (
                        <button
                          onClick={() => onToggleGroup(option.id)}
                          className="flex items-center gap-2 text-sm text-gray-900 hover:text-gray-700 font-medium"
                        >
                          <ChevronDownIcon className="w-5 h-5" />
                        </button>
                      )}

                      {/* Expanded Ingredients List */}
                      {isExpanded && (
                        <div className="mt-3 space-y-2 w-full">
                          {(!hasRecipe || !option.recipe || option.recipe.ingredients.length === 0) ? (
                            <div className="relative text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                              <button
                                onClick={() => onToggleGroup(option.id)}
                                className="absolute -top-2 -right-2 p-1 bg-white text-gray-900 hover:text-gray-700 rounded-full border border-gray-300 shadow-sm"
                              >
                                <ChevronUpIcon className="w-4 h-4" />
                              </button>
                              <p className="text-xs text-gray-500 mb-2">No ingredients yet</p>
                              <button
                                onClick={() => onOpenAddModal(option.groupId, option.groupName, option.id, option.name)}
                                className="text-xs text-gray-900 hover:text-gray-700 font-medium"
                              >
                                + Add first ingredient
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <button
                                onClick={() => onToggleGroup(option.id)}
                                className="absolute -top-2 -right-2 p-1 bg-white text-gray-900 hover:text-gray-700 rounded-full border border-gray-300 shadow-sm z-10"
                              >
                                <ChevronUpIcon className="w-4 h-4" />
                              </button>
                              
                              <div className="space-y-2">
                                {option.recipe!.ingredients.map((ing: any, idx: number) => (
                                  <div key={idx} className="bg-white p-2.5 rounded-lg border border-gray-200 hover:border-gray-300 transition">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium text-gray-900 truncate">
                                            {rawMaterials.find(rm => rm.id === ing.inventory_item_id)?.name || ing.ingredient_name}
                                          </span>
                                          <span className="text-xs text-gray-600 whitespace-nowrap">
                                            {ing.quantity_needed} {ing.unit}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                          onClick={() => onOpenEditModal(option.id, idx, ing)}
                                          className="p-1.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded transition"
                                          title="Edit ingredient"
                                        >
                                          <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => onRemoveIngredient(option.id, idx)}
                                          className="p-1.5 text-red-600 bg-white border border-red-300 hover:bg-red-50 rounded transition"
                                          title="Remove ingredient"
                                        >
                                          <TrashIcon className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                
                                <button
                                  onClick={() => onOpenAddModal(option.groupId, option.groupName, option.id, option.name)}
                                  className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-lg transition flex items-center justify-center gap-2"
                                >
                                  <PlusIcon className="w-4 h-4" />
                                  Add another ingredient
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
