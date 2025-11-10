'use client'

import { useState, useEffect, useRef } from 'react'
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { variantGroups } from '@/lib/mockData'

interface Dish {
  id: string
  name: string
  category: string
  categoryId: string
  price: number
  image: string
  available: boolean
  hasVariants?: boolean
  variantGroups: string[]
}

interface DishModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (dish: Omit<Dish, 'id'>) => void
  onUpdate?: (dish: Dish) => void
  editDish?: Dish | null
  categories: Array<{ id: string; name: string }>
}

export default function DishModal({ isOpen, onClose, onSave, onUpdate, editDish, categories }: DishModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    categoryId: '',
    price: 0,
    image: '',
    available: true,
    hasVariants: false,
    variantGroups: [] as string[],
  })
  const [imagePreview, setImagePreview] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editDish) {
      setFormData({
        name: editDish.name,
        category: editDish.category,
        categoryId: editDish.categoryId,
        price: editDish.price,
        image: editDish.image,
        available: editDish.available,
        hasVariants: editDish.hasVariants || false,
        variantGroups: editDish.variantGroups || [],
      })
      setImagePreview(editDish.image)
    } else if (categories.length > 0) {
      const firstCategory = categories[0]
      setFormData({
        name: '',
        category: firstCategory.name,
        categoryId: firstCategory.id,
        price: 0,
        image: '',
        available: true,
        hasVariants: false,
        variantGroups: [],
      })
      setImagePreview('')
    }
  }, [editDish, isOpen, categories])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB')
        return
      }

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setImagePreview(result)
        setFormData({ ...formData, image: result })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImagePreview('')
    setFormData({ ...formData, image: '' })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryId = e.target.value
    const selectedCategory = categories.find(c => c.id === categoryId)
    if (selectedCategory) {
      setFormData({ 
        ...formData, 
        categoryId: categoryId,
        category: selectedCategory.name
      })
    }
  }

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
    if (editDish && onUpdate) {
      onUpdate({ ...formData, id: editDish.id })
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
            {editDish ? 'Edit Dish' : 'Add Dish'}
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
            {/* Dish Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dish Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter dish name"
              />
            </div>

            {/* Category Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                required
                value={formData.categoryId}
                onChange={handleCategoryChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price ($)
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter price"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dish Image
              </label>
              
              {/* Image Preview or Upload Area */}
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Dish preview"
                    className="w-full h-48 object-cover rounded-xl border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow-lg"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition"
                >
                  <PhotoIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-1">
                    Click to upload dish image
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG up to 5MB
                  </p>
                </div>
              )}

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

            {/* Available */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="available"
                checked={formData.available}
                onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <label htmlFor="available" className="text-sm font-medium text-gray-700">
                Available for sale
              </label>
            </div>

            {/* Has Variants */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="hasVariantsDish"
                checked={formData.hasVariants}
                onChange={(e) => setFormData({ ...formData, hasVariants: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <label htmlFor="hasVariantsDish" className="text-sm font-medium text-gray-700">
                This dish has variants
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
              {editDish ? 'Update' : 'Add'} Dish
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
