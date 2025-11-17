'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { 
  Coffee, 
  UtensilsCrossed, 
  Cookie, 
  Cake, 
  Milk,
  Pizza,
  Sandwich,
  Soup,
  Salad,
  IceCream
} from 'lucide-react'

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, iconName: string, type: string) => void
  category?: { id: string; name: string; icon: string; type: string } | null
}

const categoryIcons = [
  { name: 'Coffee', icon: Coffee },
  { name: 'UtensilsCrossed', icon: UtensilsCrossed },
  { name: 'Cookie', icon: Cookie },
  { name: 'Cake', icon: Cake },
  { name: 'Milk', icon: Milk },
  { name: 'Pizza', icon: Pizza },
  { name: 'Sandwich', icon: Sandwich },
  { name: 'Soup', icon: Soup },
  { name: 'Salad', icon: Salad },
  { name: 'IceCream', icon: IceCream },
]

export default function CategoryModal({ isOpen, onClose, onSave, category }: CategoryModalProps) {
  const [name, setName] = useState('')
  const [iconName, setIconName] = useState('Coffee')
  const [type, setType] = useState<'food' | 'beverage'>('food')

  useEffect(() => {
    if (isOpen) {
      if (category) {
        // Edit mode
        setName(category.name)
        setIconName(category.icon)
        setType(category.type as 'food' | 'beverage')
      } else {
        // Add mode
        setName('')
        setIconName('Coffee')
        setType('food')
      }
    }
  }, [isOpen, category])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onSave(name, iconName, type)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">
            {category ? 'Edit Category' : 'Add New Category'}
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
            {/* Category Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter category name"
              />
            </div>

            {/* Category Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType('food')}
                  className={`px-4 py-3 rounded-xl font-medium transition ${
                    type === 'food'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🍽️ Food
                </button>
                <button
                  type="button"
                  onClick={() => setType('beverage')}
                  className={`px-4 py-3 rounded-xl font-medium transition ${
                    type === 'beverage'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ☕ Beverage
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {type === 'food' ? '✓ Requires kitchen preparation' : '✓ No kitchen preparation needed'}
              </p>
            </div>

            {/* Icon Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Icon
              </label>
              <div className="grid grid-cols-5 gap-3">
                {categoryIcons.map((item) => {
                  const IconComponent = item.icon
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setIconName(item.name)}
                      className={`aspect-square p-4 rounded-xl border-2 transition flex items-center justify-center ${
                        iconName === item.name
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <IconComponent 
                        className={`w-6 h-6 ${
                          iconName === item.name ? 'text-blue-500' : 'text-gray-600'
                        }`}
                        strokeWidth={1.5}
                      />
                    </button>
                  )
                })}
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
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-medium"
            >
              {category ? 'Update Category' : 'Add Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
