'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useSessionValidation } from '@/lib/hooks/useSessionValidation'
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/config/supabaseClient'
import { formatPriceModifier } from '@/lib/utils'
import VariantGroupModal from '@/app/components/manager/variants/VariantGroupModal'
import { DeleteModal } from '@/app/components/ui'
import type { VariantOption, VariantGroup } from '@/lib/types'

export default function VariantsPage() {
  useSessionValidation();
  
  const searchParams = useSearchParams()
  
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddGroupModal, setShowAddGroupModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<VariantGroup | null>(null)
  const [deletingGroup, setDeletingGroup] = useState<VariantGroup | null>(null)
  const [showInfoCards, setShowInfoCards] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchVariantGroups() {
      setLoading(true)
      const { data, error } = await supabase
        .from('variant_groups')
        .select(`
          *,
          variant_options(*)
        `)
        .order('name', { ascending: true })
      
      if (data) {
        setVariantGroups(data.map((vg: any) => ({
          id: vg.id,
          name: vg.name,
          type: vg.type,
          required: vg.required,
          options: vg.variant_options.map((vo: any) => ({
            id: vo.id,
            name: vo.name,
            priceModifier: vo.price_modifier
          }))
        })))
      }
      setLoading(false)
    }
    
    fetchVariantGroups()
  }, [])

  const filteredGroups = variantGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddVariantGroup = () => {
    setShowAddGroupModal(true)
    setEditingGroup(null)
    console.log('Opening Add Variant Group modal')
  }

  const handleEditGroup = (group: VariantGroup) => {
    setEditingGroup(group)
    console.log('Editing group:', group)
  }

  const handleSaveNewGroup = async (newGroup: Omit<VariantGroup, 'id'>) => {
    // Insert variant group
    const { data: groupData, error: groupError } = await supabase
      .from('variant_groups')
      .insert([{
        name: newGroup.name,
        type: newGroup.type,
        required: newGroup.required
      }])
      .select()
      .single()
    
    if (groupData && newGroup.options.length > 0) {
      // Insert variant options
      const { data: optionsData } = await supabase
        .from('variant_options')
        .insert(
          newGroup.options.map(opt => ({
            variant_group_id: groupData.id,
            name: opt.name,
            price_modifier: opt.priceModifier
          }))
        )
        .select()
      
      const group: VariantGroup = {
        id: groupData.id,
        name: groupData.name,
        type: groupData.type,
        required: groupData.required,
        options: optionsData?.map(opt => ({
          id: opt.id,
          name: opt.name,
          priceModifier: opt.price_modifier
        })) || []
      }
      
      setVariantGroups(prev => [...prev, group])
      setShowAddGroupModal(false)
    }
  }

  const handleUpdateGroup = async (updatedGroup: VariantGroup) => {
    // Update variant group
    const { error: groupError } = await supabase
      .from('variant_groups')
      .update({
        name: updatedGroup.name,
        type: updatedGroup.type,
        required: updatedGroup.required
      })
      .eq('id', updatedGroup.id)
    
    if (!groupError) {
      // Delete existing options
      await supabase
        .from('variant_options')
        .delete()
        .eq('variant_group_id', updatedGroup.id)
      
      // Insert new options
      if (updatedGroup.options.length > 0) {
        await supabase
          .from('variant_options')
          .insert(
            updatedGroup.options.map(opt => ({
              variant_group_id: updatedGroup.id,
              name: opt.name,
              price_modifier: opt.priceModifier
            }))
          )
      }
      
      setVariantGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g))
      setEditingGroup(null)
    }
  }

  const handleDeleteGroup = (group: VariantGroup) => {
    setDeletingGroup(group)
  }

  const confirmDeleteGroup = async () => {
    if (deletingGroup) {
      const { error } = await supabase
        .from('variant_groups')
        .delete()
        .eq('id', deletingGroup.id)
      
      if (!error) {
        setVariantGroups(prev => prev.filter(g => g.id !== deletingGroup.id))
        setDeletingGroup(null)
      }
    }
  }

  return (
    <div className="min-h-[calc(100vh-55px)] flex flex-col overflow-hidden">
      {/* Section 1: Header (Fixed) */}
      <section className="flex-shrink-0 px-4 md:px-6 pt-4 md:pt-6 border-b border-gray-200 overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4 md:mb-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Manage Variants</h1>
            <p className="text-xs md:text-sm text-gray-500">Manage variant groups and options for your menu items</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full lg:w-auto">
            
            {/* Toggle Stats Button */}
            <button 
              onClick={() => setShowInfoCards(!showInfoCards)}
              className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
              title={showInfoCards ? "Hide Statistics" : "Show Statistics"}
            >
              {showInfoCards ? (
                <EyeSlashIcon className="w-5 h-5 text-gray-600" />
              ) : (
                <EyeIcon className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {/* Search */}
            <div className="relative flex-1 lg:flex-none">
              <input
                type="text"
                placeholder="Search variant groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-4 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 w-full lg:w-64 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Info Cards */}
        {showInfoCards && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="bg-white rounded-xl p-3 md:p-4 border border-gray-200">
              <div className="text-xs md:text-sm text-gray-500 mb-1">Total Groups</div>
              <div className="text-xl md:text-2xl font-bold text-gray-900">{variantGroups.length}</div>
            </div>
            <div className="bg-white rounded-xl p-3 md:p-4 border border-gray-200">
              <div className="text-xs md:text-sm text-gray-500 mb-1">Required Groups</div>
              <div className="text-xl md:text-2xl font-bold text-gray-900">
                {variantGroups.filter(g => g.required).length}
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 md:p-4 border border-gray-200">
              <div className="text-xs md:text-sm text-gray-500 mb-1">Optional Groups</div>
              <div className="text-xl md:text-2xl font-bold text-gray-900">
                {variantGroups.filter(g => !g.required).length}
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 md:p-4 border border-gray-200">
              <div className="text-xs md:text-sm text-gray-500 mb-1">Total Options</div>
              <div className="text-xl md:text-2xl font-bold text-gray-900">
                {variantGroups.reduce((sum, g) => sum + g.options.length, 0)}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Section 2: Variant Groups List (Scrollable) */}
      <section className="flex-1 overflow-y-auto bg-gray-50 px-4 md:px-6 py-4 md:py-6">
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 md:gap-4 space-y-3 md:space-y-4">
          {/* Add New Variant Group Card */}
          <button
            onClick={handleAddVariantGroup}
            className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-4 md:p-6 hover:border-gray-900 hover:bg-gray-100 transition flex flex-col items-center justify-center gap-2 md:gap-3 min-h-[180px] md:min-h-[200px] break-inside-avoid mb-3 md:mb-4 w-full"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-900 rounded-full flex items-center justify-center">
              <PlusIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="text-center">
              <p className="text-sm md:text-base font-semibold text-gray-700">Add New Variant Group</p>
              <p className="text-xs text-gray-500 mt-1">Create a new variant group</p>
            </div>
          </button>

          {/* Variant Group Cards */}
          {filteredGroups.map((group) => (
            <div key={group.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col break-inside-avoid mb-3 md:mb-4">
              {/* Group Header */}
              <div className="p-3 md:p-4 border-b border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-base md:text-lg font-bold text-gray-900">{group.name}</h3>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleEditGroup(group)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                      title="Edit"
                    >
                      <PencilIcon className="w-4 h-4 text-gray-600" />
                    </button>
                    <button 
                      onClick={() => handleDeleteGroup(group)}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition"
                      title="Delete"
                      style={{ color: '#FF6859' }}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  {group.required && (
                    <span className="text-xs text-white px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: '#FF6859' }}>
                      Required
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-700">
                    {group.type === 'single' ? 'Single' : 'Multiple'}
                  </span>
                </div>
                
                <p className="text-xs md:text-sm text-gray-500">{group.options.length} options</p>
              </div>

              {/* Options List */}
              <div className="p-3 md:p-4 space-y-2 flex-1">
                {group.options.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <span className="text-xs md:text-sm font-medium text-gray-700">{option.name}</span>
                    {option.priceModifier !== 0 && (
                      <span className="text-xs font-semibold" style={{ color: option.priceModifier > 0 ? '#7FCC2B' : '#FF6859' }}>
                        {formatPriceModifier(option.priceModifier)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Variant Group Modal */}
      <VariantGroupModal
        isOpen={showAddGroupModal || editingGroup !== null}
        onClose={() => {
          setShowAddGroupModal(false)
          setEditingGroup(null)
        }}
        onSave={handleSaveNewGroup}
        onUpdate={handleUpdateGroup}
        editGroup={editingGroup}
      />

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deletingGroup !== null}
        onClose={() => setDeletingGroup(null)}
        onConfirm={confirmDeleteGroup}
        title="Delete Variant Group"
        itemName={deletingGroup?.name || ''}
        description="All options in this variant group will also be deleted."
      />
    </div>
  )
}
