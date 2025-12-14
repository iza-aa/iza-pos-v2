'use client'

import { useState, useEffect } from 'react'
import { PencilIcon, PlusIcon, TrashIcon, XMarkIcon, MagnifyingGlassIcon, EyeIcon, EyeSlashIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/config/supabaseClient'
import type { VariantOption } from '@/lib/types'

interface ModifierRecipe {
  id: string
  product_name: string
  variant_name: string
  modifier_percentage: number
  modifier_type: string
  recipe_scope: string
  is_active: boolean
}

export default function DefaultModifiersTab() {
  const [modifiers, setModifiers] = useState<ModifierRecipe[]>([])
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<number>(0)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // Fetch variant groups and options
      const { data: groupsData } = await supabase
        .from('variant_groups')
        .select('id, name')
        .eq('is_active', true)

      const { data: optionsData } = await supabase
        .from('variant_options')
        .select('id, name, variant_group_id')
        .eq('is_active', true)

      // Map options with group names
      const optionsWithGroups: VariantOption[] = (optionsData || []).map(opt => {
        const group = (groupsData || []).find(g => g.id === opt.variant_group_id)
        return {
          id: opt.id,
          name: opt.name,
          groupName: group?.name || 'Unknown',
          groupId: opt.variant_group_id
        }
      })
      setVariantOptions(optionsWithGroups)

      // Fetch global modifiers (recipe_scope = 'global-modifier')
      const { data: modifiersData, error } = await supabase
        .from('recipes')
        .select('id, product_name, variant_name, modifier_percentage, modifier_type, recipe_scope, is_active')
        .eq('recipe_scope', 'global-modifier')
        .order('product_name')

      if (error) throw error
      setModifiers(modifiersData || [])

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateModifier = async (id: string, newPercentage: number) => {
    try {
      const { error } = await supabase
        .from('recipes')
        .update({ modifier_percentage: newPercentage })
        .eq('id', id)

      if (error) throw error
      
      // Update local state
      setModifiers(prev => prev.map(m => 
        m.id === id ? { ...m, modifier_percentage: newPercentage } : m
      ))
      setEditingId(null)
    } catch (error) {
      console.error('Error updating modifier:', error)
      alert('Failed to update modifier')
    }
  }

  const filteredModifiers = modifiers.filter(m =>
    m.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.variant_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group modifiers by variant group (extracted from product_name like "Size - Large")
  const groupedModifiers = filteredModifiers.reduce((acc, modifier) => {
    const parts = modifier.product_name.split(' - ')
    const groupName = parts[0] || 'Other'
    
    if (!acc[groupName]) {
      acc[groupName] = []
    }
    acc[groupName].push(modifier)
    return acc
  }, {} as Record<string, ModifierRecipe[]>)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <section className="flex-shrink-0 p-4 md:p-6 bg-white border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg md:text-xl font-bold text-gray-800">Default Modifiers</h2>
            <p className="text-xs md:text-sm text-gray-500">
              Set percentage modifiers that apply to ALL products. Example: Large = +50% means all Large items use 1.5× base ingredients.
            </p>
          </div>

          <div className="relative flex-1 md:flex-initial">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search modifiers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 w-full md:w-64"
            />
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-4 p-3 md:p-4 rounded-xl border-2" style={{ backgroundColor: '#FFE5E2', borderColor: '#FF6859' }}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FF6859' }}>
              <span className="text-white font-bold text-sm">%</span>
            </div>
            <div>
              <h4 className="font-semibold text-sm md:text-base" style={{ color: '#FF6859' }}>How Modifiers Work</h4>
              <p className="text-xs md:text-sm text-gray-900 mt-1">
                <strong>+50%</strong> = Base recipe × 1.5 (e.g., 10g → 15g)<br/>
                <strong>-20%</strong> = Base recipe × 0.8 (e.g., 10g → 8g)<br/>
                <strong>0%</strong> = Same as base recipe
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="flex-1 overflow-auto bg-gray-50 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Loading modifiers...</p>
          </div>
        ) : Object.keys(groupedModifiers).length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-gray-500 mb-2">No modifiers found</p>
              <p className="text-sm text-gray-400">Run SQL file 16_hybrid_recipe_system.sql to create default modifiers</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedModifiers).map(([groupName, groupModifiers]) => (
              <div key={groupName} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-800">{groupName}</h3>
                </div>
                <table className="w-full table-fixed">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-1/4 px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Option</th>
                      <th className="w-1/4 px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Modifier %</th>
                      <th className="w-1/3 px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden sm:table-cell">Effect</th>
                      <th className="w-1/6 px-4 md:px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {groupModifiers.map(modifier => {
                      const optionName = modifier.product_name.split(' - ')[1] || modifier.variant_name || 'Unknown'
                      const isEditing = editingId === modifier.id
                      const multiplier = 1 + (modifier.modifier_percentage / 100)
                      
                      return (
                        <tr key={modifier.id} className="hover:bg-gray-50 h-14">
                          <td className="w-1/4 px-4 md:px-6 py-4 text-xs md:text-sm font-medium text-gray-900">
                            {optionName}
                          </td>
                          <td className="w-1/4 px-4 md:px-6 py-4">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(parseFloat(e.target.value) || 0)}
                                  className="w-16 md:w-24 px-2 py-1 border border-gray-900 rounded focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
                                  autoFocus
                                />
                                <span className="text-gray-500 text-sm">%</span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium text-gray-900"
                                style={{
                                  backgroundColor: modifier.modifier_percentage > 0 
                                    ? '#B2FF5E' 
                                    : modifier.modifier_percentage < 0 
                                      ? '#FF6859' 
                                      : '#e5e7eb'
                                }}>
                                {modifier.modifier_percentage >= 0 ? '+' : ''}{modifier.modifier_percentage}%
                              </span>
                            )}
                          </td>
                          <td className="w-1/3 px-4 md:px-6 py-4 text-xs md:text-sm text-gray-600 hidden sm:table-cell">
                            Base × {multiplier.toFixed(2)}
                            <span className="text-gray-400 ml-2">
                              (e.g., 10g → {(10 * multiplier).toFixed(1)}g)
                            </span>
                          </td>
                          <td className="w-1/6 px-4 md:px-6 py-4 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleUpdateModifier(modifier.id, editValue)}
                                  className="px-3 py-1 text-white text-xs md:text-sm rounded transition"
                                  style={{ backgroundColor: '#B2FF5E', color: '#000000' }}
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="px-3 py-1 bg-gray-300 text-gray-700 text-xs md:text-sm rounded hover:bg-gray-400"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingId(modifier.id)
                                  setEditValue(modifier.modifier_percentage)
                                }}
                                className="text-xs md:text-sm font-medium text-gray-700 hover:text-gray-900 transition"
                                title="Edit modifier"
                              >
                                Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
