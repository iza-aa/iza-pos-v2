'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/config/supabaseClient'
import { ProductImagePlaceholder } from '@/app/components/ui'

interface Product {
  id: string
  name: string
  category: string
  categoryId: string
  price: number
  image: string | null
  available: boolean
  hasVariants: boolean
  description?: string
}

interface VariantGroup {
  id: string
  name: string
  type: 'single' | 'multiple'
  is_required: boolean
  options: VariantOption[]
}

interface VariantOption {
  id: string
  name: string
  price_modifier: number
}

interface SelectedVariant {
  variantGroupId: string
  variantGroupName: string
  optionId: string
  optionName: string
  priceModifier: number
}

interface VariantModalProps {
  product: Product
  onAddToCart: (product: Product, variants: SelectedVariant[], totalPrice: number, quantity: number) => void
  onClose: () => void
}

export default function VariantModal({ product, onAddToCart, onClose }: VariantModalProps) {
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([])
  const [selectedVariants, setSelectedVariants] = useState<SelectedVariant[]>([])
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)

  // Fetch variant groups for this product
  useEffect(() => {
    fetchVariantGroups()
  }, [product.id])

  async function fetchVariantGroups() {
    setLoading(true)
    
    // Get variant groups associated with this product
    const { data: productVariantGroups, error: pvgError } = await supabase
      .from('product_variant_groups')
      .select('variant_group_id')
      .eq('product_id', product.id)

    if (pvgError || !productVariantGroups) {
      console.error('Error fetching product variant groups:', pvgError)
      setLoading(false)
      return
    }

    const variantGroupIds = productVariantGroups.map(pvg => pvg.variant_group_id)

    // Fetch variant groups details
    const { data: groups, error: groupsError } = await supabase
      .from('variant_groups')
      .select('*')
      .in('id', variantGroupIds)
      .order('created_at', { ascending: true })

    if (groupsError || !groups) {
      console.error('Error fetching variant groups:', groupsError)
      setLoading(false)
      return
    }

    // Fetch options for each group
    const formattedGroups: VariantGroup[] = await Promise.all(
      groups.map(async (group) => {
        const { data: options, error: optionsError } = await supabase
          .from('variant_options')
          .select('id, name, price_modifier')
          .eq('variant_group_id', group.id)
          .order('sort_order', { ascending: true })

        if (optionsError) {
          console.error('Error fetching options for group:', group.id, optionsError)
        }

        return {
          id: group.id,
          name: group.name,
          type: group.type as 'single' | 'multiple',
          is_required: group.is_required,
          options: options || []
        }
      })
    )

    setVariantGroups(formattedGroups)
    setLoading(false)
  }

  const handleVariantSelection = (
    group: VariantGroup,
    option: VariantOption
  ) => {
    if (group.type === 'single') {
      // Single selection - replace existing selection for this group
      setSelectedVariants(prev => [
        ...prev.filter(v => v.variantGroupId !== group.id),
        {
          variantGroupId: group.id,
          variantGroupName: group.name,
          optionId: option.id,
          optionName: option.name,
          priceModifier: option.price_modifier
        }
      ])
    } else {
      // Multiple selection - toggle
      const exists = selectedVariants.find(
        v => v.variantGroupId === group.id && v.optionId === option.id
      )
      
      if (exists) {
        setSelectedVariants(prev =>
          prev.filter(v => !(v.variantGroupId === group.id && v.optionId === option.id))
        )
      } else {
        setSelectedVariants(prev => [
          ...prev,
          {
            variantGroupId: group.id,
            variantGroupName: group.name,
            optionId: option.id,
            optionName: option.name,
            priceModifier: option.price_modifier
          }
        ])
      }
    }
  }

  const isOptionSelected = (groupId: string, optionId: string) => {
    return selectedVariants.some(
      v => v.variantGroupId === groupId && v.optionId === optionId
    )
  }

  const calculateTotal = () => {
    const modifiersTotal = selectedVariants.reduce(
      (sum, v) => sum + v.priceModifier,
      0
    )
    return (product.price + modifiersTotal) * quantity
  }

  const canAddToCart = () => {
    // Check if all required variant groups have selections
    return variantGroups.every(group => {
      if (!group.is_required) return true
      return selectedVariants.some(v => v.variantGroupId === group.id)
    })
  }

  const handleAddToCart = () => {
    if (!canAddToCart()) return
    onAddToCart(product, selectedVariants, calculateTotal() / quantity, quantity)
  }

  return (
    <div className="fixed inset-0 bg-transparent z-50 flex items-end" onClick={onClose}>
      {/* Modal Content - Bottom Sheet */}
      <div 
        className="bg-white w-full rounded-t-3xl max-h-[90vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{product.name}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <XMarkIcon className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Product Image */}
          <div className="mb-4">
            <ProductImagePlaceholder
              name={product.name}
              imageUrl={product.image}
              className="w-full h-48 rounded-xl object-cover"
            />
          </div>

          {/* Base Price */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <span className="text-sm text-gray-600">Base Price</span>
            <span className="text-lg font-bold text-green-600">
              Rp {product.price.toLocaleString('id-ID')}
            </span>
          </div>

          {/* Variant Groups */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading options...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {variantGroups.map(group => (
                <div key={group.id}>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    {group.name}
                    {group.is_required && <span className="text-red-500 ml-1">*</span>}
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    {group.type === 'single' ? 'Select one' : 'Select multiple'}
                  </p>
                  
                  <div className="space-y-2">
                    {group.options.map(option => {
                      const isSelected = isOptionSelected(group.id, option.id)
                      return (
                        <button
                          key={option.id}
                          onClick={() => handleVariantSelection(group, option)}
                          className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition ${
                            isSelected
                              ? 'border-gray-900 bg-gray-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'border-gray-900 bg-gray-900' : 'border-gray-300'
                            }`}>
                              {isSelected && (
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                              )}
                            </div>
                            <span className="font-medium text-gray-900">{option.name}</span>
                          </div>
                          {option.price_modifier !== 0 && (
                            <span className={`text-sm font-semibold ${
                              option.price_modifier > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {option.price_modifier > 0 ? '+' : ''}Rp {option.price_modifier.toLocaleString('id-ID')}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quantity Selector */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Quantity</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MinusIcon className="w-5 h-5 text-gray-600" />
              </button>
              <span className="text-xl font-bold text-gray-900 w-12 text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 transition"
              >
                <PlusIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer - Add to Cart Button */}
        <div className="p-4 border-t border-gray-200 bg-white pb-24">
          <button
            onClick={handleAddToCart}
            disabled={!canAddToCart()}
            className="w-full py-4 bg-gray-900 text-white rounded-xl font-semibold text-lg hover:bg-gray-800 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Add to Order - Rp {calculateTotal().toLocaleString('id-ID')}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
