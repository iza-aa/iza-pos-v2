'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { variantGroups } from '@/app/lib/mockData'

interface Product {
  id: string
  name: string
  category: string
  price: number
  stock: number
  hasVariants?: boolean
  variantGroups?: string[]
}

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (product: Omit<Product, 'id'>) => void
  onUpdate?: (product: Product) => void
  editProduct?: Product | null
}

const categories = ['Coffee', 'Food', 'Snack', 'Dessert', 'Non Coffee']

export default function ProductModal({ isOpen, onClose, onSave, onUpdate, editProduct }: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Coffee',
    price: 0,
    stock: 0,
    hasVariants: false,
    variantGroups: [] as string[],
  })

  useEffect(() => {
    if (editProduct) {
      setFormData({
        name: editProduct.name,
        category: editProduct.category,
        price: editProduct.price,
        stock: editProduct.stock,
        hasVariants: editProduct.hasVariants || false,
        variantGroups: editProduct.variantGroups || [],
      })
    } else {
      setFormData({
        name: '',
        category: 'Coffee',
        price: 0,
        stock: 0,
        hasVariants: false,
        variantGroups: [],
      })
    }
  }, [editProduct, isOpen])

  const handleToggleVariantGroup = (variantGroupId: string) => {
    setFormData(prev => ({
      ...prev,
      variantGroups: prev.variantGroups.includes(variantGroupId)
        ? prev.variantGroups.filter(id => id !== variantGroupId)
        : [...prev.variantGroups, variantGroupId]
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editProduct && onUpdate) {
      onUpdate({ ...formData, id: editProduct.id })
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
            {editProduct ? 'Edit Product' : 'Add New Product'}
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
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter product name"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price (Rp)
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter price"
              />
            </div>

            {/* Stock */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter stock quantity"
              />
            </div>

            {/* Has Variants */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="hasVariants"
                checked={formData.hasVariants}
                onChange={(e) => setFormData({ ...formData, hasVariants: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <label htmlFor="hasVariants" className="text-sm font-medium text-gray-700">
                This product has variants
              </label>
            </div>

            {/* Variant Groups Selection (shown when hasVariants is checked) */}
            {formData.hasVariants && (
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Variant Groups
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {variantGroups.map((group) => (
                    <div key={group.id} className="flex items-start gap-3 p-2 bg-white rounded-lg">
                      <input
                        type="checkbox"
                        id={`variant-${group.id}`}
                        checked={formData.variantGroups.includes(group.id)}
                        onChange={() => handleToggleVariantGroup(group.id)}
                        className="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <label 
                          htmlFor={`variant-${group.id}`} 
                          className="text-sm font-medium text-gray-700 cursor-pointer"
                        >
                          {group.name}
                        </label>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {group.options.length} option{group.options.length !== 1 ? 's' : ''} • {group.type === 'single' ? 'Single select' : 'Multiple select'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {variantGroups.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No variant groups available. Create variant groups first.
                    </p>
                  )}
                </div>
              </div>
            )}
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
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-medium"
            >
              {editProduct ? 'Update' : 'Add'} Product
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
