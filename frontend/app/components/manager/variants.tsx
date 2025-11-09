'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { PlusIcon, PencilIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { variantGroups as mockVariantGroups } from '@/app/lib/mockData'
import VariantGroupModal from './VariantGroupModal'

interface VariantOption {
  id: string
  name: string
  priceModifier: number
}

interface VariantGroup {
  id: string
  name: string
  type: 'single' | 'multiple'
  required: boolean
  options: VariantOption[]
}

export default function VariantsManager() {
  const searchParams = useSearchParams()
  const viewAsOwner = searchParams.get('viewAs') === 'owner'
  
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([])
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddGroupModal, setShowAddGroupModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<VariantGroup | null>(null)
  const [editingOption, setEditingOption] = useState<{groupId: string, option: VariantOption} | null>(null)

  useEffect(() => {
    // Use data from mockData
    setVariantGroups(mockVariantGroups)

    // Collapse all by default (Improvement #4)
    const collapsed: Record<string, boolean> = {};
    mockVariantGroups.forEach(group => {
      collapsed[group.id] = false;
    });
    setExpandedGroups(collapsed)
  }, [])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }

  const filteredGroups = variantGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddVariantGroup = () => {
    setShowAddGroupModal(true)
    setEditingGroup(null)
    console.log('Opening Add Variant Group modal')
  }

  const handleAddOption = (groupId: string) => {
    const group = variantGroups.find(g => g.id === groupId)
    setEditingGroup(group || null)
    console.log('Opening edit to add option to group:', group?.name)
  }

  const handleEditGroup = (group: VariantGroup) => {
    setEditingGroup(group)
    console.log('Editing group:', group)
  }

  const handleSaveNewGroup = (newGroup: Omit<VariantGroup, 'id'>) => {
    const group: VariantGroup = {
      ...newGroup,
      id: `vg-${Date.now()}`,
    }
    setVariantGroups(prev => [...prev, group])
    setShowAddGroupModal(false)
    console.log('Variant group added:', group)
  }

  const handleUpdateGroup = (updatedGroup: VariantGroup) => {
    setVariantGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g))
    setEditingGroup(null)
    console.log('Variant group updated:', updatedGroup)
  }

  const handleDeleteGroup = (group: VariantGroup) => {
    if (confirm(`Are you sure you want to delete variant group "${group.name}"?`)) {
      setVariantGroups(prev => prev.filter(g => g.id !== group.id))
      console.log('Group deleted:', group)
    }
  }

  const handleEditOption = (groupId: string, option: VariantOption) => {
    setEditingOption({ groupId, option })
    console.log('Editing option:', option.name)
  }

  const handleDeleteOption = (groupId: string, option: VariantOption) => {
    if (confirm(`Are you sure you want to delete option "${option.name}"?`)) {
      setVariantGroups(prev => prev.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            options: g.options.filter(opt => opt.id !== option.id)
          }
        }
        return g
      }))
      console.log('Option deleted:', option)
    }
  }

  return (
    <div className="h-[calc(100vh-64px)] bg-gray-50 flex flex-col overflow-hidden">
      {/* Section 1: Header (Fixed) */}
      <section className="flex-shrink-0 p-8 pb-4 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Manage Variants</h1>
            {viewAsOwner && (
              <span className="inline-block text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                👁️ Viewing as Owner
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search variant groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-4 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>

            {/* Add New Variant Group */}
            {!viewAsOwner && (
              <button 
                onClick={handleAddVariantGroup}
                className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition font-medium"
              >
                <PlusIcon className="w-5 h-5" />
                Add Variant Group
              </button>
            )}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">Total Groups</div>
            <div className="text-2xl font-bold text-gray-800">{variantGroups.length}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">Required Groups</div>
            <div className="text-2xl font-bold text-blue-600">
              {variantGroups.filter(g => g.required).length}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">Optional Groups</div>
            <div className="text-2xl font-bold text-green-600">
              {variantGroups.filter(g => !g.required).length}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">Total Options</div>
            <div className="text-2xl font-bold text-gray-800">
              {variantGroups.reduce((sum, g) => sum + g.options.length, 0)}
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Variant Groups List (Scrollable) */}
      <section className="flex-1 overflow-y-auto px-8 pb-8">
        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <div key={group.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Group Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Expand/Collapse Button */}
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="p-1 hover:bg-gray-100 rounded-lg transition"
                    >
                      {expandedGroups[group.id] ? (
                        <ChevronUpIcon className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5 text-gray-600" />
                      )}
                    </button>

                    {/* Group Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-gray-800">{group.name}</h3>
                        {group.required && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">
                            Required
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          group.type === 'single' 
                            ? 'bg-blue-100 text-blue-600' 
                            : 'bg-purple-100 text-purple-600'
                        }`}>
                          {group.type === 'single' ? 'Single Select' : 'Multiple Select'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{group.options.length} options</p>
                    </div>
                  </div>

                  {/* Actions */}
                  {!viewAsOwner && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleAddOption(group.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                        title="Add Option"
                      >
                        <PlusIcon className="w-5 h-5 text-blue-600" />
                      </button>
                      <button 
                        onClick={() => handleEditGroup(group)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                        title="Edit Group"
                      >
                        <PencilIcon className="w-5 h-5 text-gray-600" />
                      </button>
                      <button 
                        onClick={() => handleDeleteGroup(group)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                        title="Delete Group"
                      >
                        <TrashIcon className="w-5 h-5 text-red-600" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Options List */}
              {expandedGroups[group.id] && (
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-3">
                    {group.options.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:border-blue-300 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="font-medium text-gray-800">{option.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {option.priceModifier !== 0 && (
                            <span className={`text-sm font-semibold ${
                              option.priceModifier > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {option.priceModifier > 0 ? '+' : ''}{option.priceModifier > 0 ? '$' : '-$'}{Math.abs(option.priceModifier).toFixed(2)}
                            </span>
                          )}
                          {!viewAsOwner && (
                            <>
                              <button 
                                onClick={() => handleEditOption(group.id, option)}
                                className="p-1 hover:bg-gray-100 rounded transition"
                              >
                                <PencilIcon className="w-4 h-4 text-gray-600" />
                              </button>
                              <button 
                                onClick={() => handleDeleteOption(group.id, option)}
                                className="p-1 hover:bg-gray-100 rounded transition"
                              >
                                <TrashIcon className="w-4 h-4 text-red-600" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
    </div>
  )
}
