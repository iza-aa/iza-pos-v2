'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { variantGroups as mockVariantGroups } from '@/lib/mockData'
import VariantGroupModal from '@/app/components/manager/variants/VariantGroupModal'
import DeleteModal from '@/app/components/ui/DeleteModal'

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

export default function VariantsPage() {
  const searchParams = useSearchParams()
  const viewAsOwner = searchParams.get('viewAs') === 'owner'
  
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddGroupModal, setShowAddGroupModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<VariantGroup | null>(null)
  const [deletingGroup, setDeletingGroup] = useState<VariantGroup | null>(null)
  const [showInfoCards, setShowInfoCards] = useState(true)

  useEffect(() => {
    // Use data from mockData
    setVariantGroups(mockVariantGroups)
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
    setDeletingGroup(group)
  }

  const confirmDeleteGroup = () => {
    if (deletingGroup) {
      setVariantGroups(prev => prev.filter(g => g.id !== deletingGroup.id))
      console.log('Group deleted:', deletingGroup)
    }
  }

  return (
    <div className="h-[calc(100vh-55px)] flex flex-col overflow-hidden">
      {/* Section 1: Header (Fixed) */}
      <section className="flex-shrink-0 px-6 pt-6 border-b border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-gray-800">Manage Variants</h1>
            <p className="text-sm text-gray-500">Manage variant groups and options for your menu items</p>
          </div>

          <div className="flex items-center gap-4">
            {viewAsOwner && (
              <span className="inline-block text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                👁️ Viewing as Owner
              </span>
            )}
            
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
            <div className="relative">
              <input
                type="text"
                placeholder="Search variant groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-4 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
          </div>
        </div>

        {/* Info Cards */}
        {showInfoCards && (
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
        )}
      </section>

      {/* Section 2: Variant Groups List (Scrollable) */}
      <section className="flex-1 overflow-y-auto bg-gray-100 px-6 py-6">
        <div className="grid grid-cols-4 gap-4">
          {/* Add New Variant Group Card */}
          {!viewAsOwner && (
            <button
              onClick={handleAddVariantGroup}
              className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-blue-500 hover:bg-blue-50 transition flex flex-col items-center justify-center gap-3 min-h-[200px]"
            >
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <PlusIcon className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-700">Add New Variant Group</p>
                <p className="text-xs text-gray-500 mt-1">Create a new variant group</p>
              </div>
            </button>
          )}

          {/* Variant Group Cards */}
          {filteredGroups.map((group) => (
            <div key={group.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
              {/* Group Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-800">{group.name}</h3>
                  {!viewAsOwner && (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleEditGroup(group)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                        title="Edit"
                      >
                        <PencilIcon className="w-4 h-4 text-blue-600" />
                      </button>
                      <button 
                        onClick={() => handleDeleteGroup(group)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mb-2">
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
                    {group.type === 'single' ? 'Single' : 'Multiple'}
                  </span>
                </div>
                
                <p className="text-sm text-gray-500">{group.options.length} options</p>
              </div>

              {/* Options List */}
              <div className="p-4 space-y-2 flex-1">
                {group.options.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm font-medium text-gray-700">{option.name}</span>
                    {option.priceModifier !== 0 && (
                      <span className={`text-xs font-semibold ${
                        option.priceModifier > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {option.priceModifier > 0 ? '+' : ''}{option.priceModifier > 0 ? '$' : '-$'}{Math.abs(option.priceModifier).toFixed(2)}
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
