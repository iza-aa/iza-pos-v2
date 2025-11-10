'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

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

interface VariantGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (group: Omit<VariantGroup, 'id'>) => void
  onUpdate?: (group: VariantGroup) => void
  editGroup?: VariantGroup | null
}

export default function VariantGroupModal({ isOpen, onClose, onSave, onUpdate, editGroup }: VariantGroupModalProps) {
  const [formData, setFormData] = useState<Omit<VariantGroup, 'id'>>({
    name: '',
    type: 'single',
    required: false,
    options: [],
  })

  const [newOption, setNewOption] = useState({ name: '', priceModifier: 0 })

  useEffect(() => {
    if (editGroup) {
      setFormData({
        name: editGroup.name,
        type: editGroup.type,
        required: editGroup.required,
        options: editGroup.options,
      })
    } else {
      setFormData({
        name: '',
        type: 'single',
        required: false,
        options: [],
      })
    }
  }, [editGroup, isOpen])

  const handleAddOption = () => {
    if (newOption.name.trim()) {
      const option: VariantOption = {
        id: `opt-${Date.now()}`,
        name: newOption.name,
        priceModifier: newOption.priceModifier,
      }
      setFormData({
        ...formData,
        options: [...formData.options, option],
      })
      setNewOption({ name: '', priceModifier: 0 })
    }
  }

  const handleRemoveOption = (optionId: string) => {
    setFormData({
      ...formData,
      options: formData.options.filter(opt => opt.id !== optionId),
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editGroup && onUpdate) {
      onUpdate({ ...formData, id: editGroup.id })
    } else {
      onSave(formData)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">
            {editGroup ? 'Edit Variant Group' : 'Add Variant Group'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <XMarkIcon className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Group Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Size, Sugar Level, Toppings"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selection Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="single"
                    checked={formData.type === 'single'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'single' })}
                    className="w-4 h-4 text-blue-500"
                  />
                  <span className="text-sm">Single Select</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="multiple"
                    checked={formData.type === 'multiple'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'multiple' })}
                    className="w-4 h-4 text-blue-500"
                  />
                  <span className="text-sm">Multiple Select</span>
                </label>
              </div>
            </div>

            {/* Required */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="required"
                checked={formData.required}
                onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <label htmlFor="required" className="text-sm font-medium text-gray-700">
                This variant is required
              </label>
            </div>

            {/* Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Options ({formData.options.length})
              </label>
              
              {/* Add Option Form - Improved UI (Improvement #5) */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={newOption.name}
                      onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Option name (e.g., Small, Large)"
                    />
                  </div>
                  <div className="w-36">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                        $
                      </span>
                      <input
                        type="number"
                        value={newOption.priceModifier}
                        onChange={(e) => setNewOption({ ...newOption, priceModifier: Number(e.target.value) })}
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                        step="0.50"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-center">Price modifier</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
                  >
                    <PlusIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Add</span>
                  </button>
                </div>
              </div>

              {/* Options List */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {formData.options.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <span className="font-medium text-gray-800">{option.name}</span>
                      {option.priceModifier !== 0 && (
                        <span className={`ml-2 text-sm font-semibold ${
                          option.priceModifier > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {option.priceModifier > 0 ? '+' : ''}{option.priceModifier > 0 ? '$' : '-$'}{Math.abs(option.priceModifier).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(option.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formData.options.length === 0}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {editGroup ? 'Update' : 'Create'} Group
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
