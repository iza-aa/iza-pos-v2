'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BeakerIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/config/supabaseClient'

type ProductRow = {
  id: string
  name: string
  price: number | null
  type: string | null
  has_variants: boolean | null
}

type ProductVariantGroupRow = {
  id: string
  product_id: string | null
  variant_group_id: string | null
}

type VariantGroupRow = {
  id: string
  name: string
  type: string
  required: boolean | null
  is_active: boolean | null
}

type VariantOptionRow = {
  id: string
  variant_group_id: string | null
  name: string
  price_modifier: number | null
  sort_order: number | null
  is_active: boolean | null
}

type InventoryItemRow = {
  id: string
  name: string
  unit: string
  current_stock: number | null
  status: string | null
}

type AdjustmentRow = {
  id: string
  product_id: string
  variant_option_id: string
  inventory_item_id: string
  adjustment_quantity: number
  notes: string | null
  created_at: string | null
  updated_at: string | null
}

type AdjustmentView = AdjustmentRow & {
  productName: string
  variantGroupName: string
  variantOptionName: string
  inventoryItemName: string
  unit: string
}

type ToastType = 'success' | 'error' | 'info'

type ToastState = {
  type: ToastType
  message: string
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

const formatQuantity = (value: number, unit: string) => {
  const sign = value > 0 ? '+' : ''
  return `${sign}${Number(value).toLocaleString('id-ID', {
    maximumFractionDigits: 2,
  })} ${unit}`
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return 'Unexpected error occurred.'
}

export default function ProductVariantRecipesTab() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [productVariantGroups, setProductVariantGroups] = useState<ProductVariantGroupRow[]>([])
  const [variantGroups, setVariantGroups] = useState<VariantGroupRow[]>([])
  const [variantOptions, setVariantOptions] = useState<VariantOptionRow[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItemRow[]>([])
  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>([])

  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedVariantOptionId, setSelectedVariantOptionId] = useState('')
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ type, message })
    window.setTimeout(() => setToast(null), 3500)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      const [productsResult, pvgResult, groupsResult, optionsResult, inventoryResult, adjustmentsResult] =
        await Promise.all([
          supabase
            .from('products')
            .select('id, name, price, type, has_variants')
            .eq('available', true)
            .order('name', { ascending: true }),
          supabase
            .from('product_variant_groups')
            .select('id, product_id, variant_group_id'),
          supabase
            .from('variant_groups')
            .select('id, name, type, required, is_active')
            .eq('is_active', true)
            .order('name', { ascending: true }),
          supabase
            .from('variant_options')
            .select('id, variant_group_id, name, price_modifier, sort_order, is_active')
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
          supabase
            .from('inventory_items')
            .select('id, name, unit, current_stock, status')
            .order('name', { ascending: true }),
          supabase
            .from('product_variant_recipe_adjustments')
            .select('id, product_id, variant_option_id, inventory_item_id, adjustment_quantity, notes, created_at, updated_at')
            .order('updated_at', { ascending: false }),
        ])

      if (productsResult.error) throw productsResult.error
      if (pvgResult.error) throw pvgResult.error
      if (groupsResult.error) throw groupsResult.error
      if (optionsResult.error) throw optionsResult.error
      if (inventoryResult.error) throw inventoryResult.error
      if (adjustmentsResult.error) throw adjustmentsResult.error

      setProducts((productsResult.data ?? []) as ProductRow[])
      setProductVariantGroups((pvgResult.data ?? []) as ProductVariantGroupRow[])
      setVariantGroups((groupsResult.data ?? []) as VariantGroupRow[])
      setVariantOptions((optionsResult.data ?? []) as VariantOptionRow[])
      setInventoryItems((inventoryResult.data ?? []) as InventoryItemRow[])
      setAdjustments((adjustmentsResult.data ?? []) as AdjustmentRow[])
    } catch (error) {
      console.error('Failed to load product variant recipes:', error)
      showToast('error', getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const productsWithVariants = useMemo(() => {
    const productIdsWithGroups = new Set(
      productVariantGroups
        .map((row) => row.product_id)
        .filter((value): value is string => Boolean(value)),
    )

    return products.filter((product) => product.has_variants || productIdsWithGroups.has(product.id))
  }, [productVariantGroups, products])

  const availableVariantGroups = useMemo(() => {
    if (!selectedProductId) return []

    const groupIds = new Set(
      productVariantGroups
        .filter((row) => row.product_id === selectedProductId)
        .map((row) => row.variant_group_id)
        .filter((value): value is string => Boolean(value)),
    )

    return variantGroups.filter((group) => groupIds.has(group.id))
  }, [productVariantGroups, selectedProductId, variantGroups])

  const availableVariantOptions = useMemo(() => {
    const groupIds = new Set(availableVariantGroups.map((group) => group.id))

    return variantOptions.filter((option) => {
      if (!option.variant_group_id) return false
      return groupIds.has(option.variant_group_id)
    })
  }, [availableVariantGroups, variantOptions])

  const selectedInventoryItem = useMemo(() => {
    return inventoryItems.find((item) => item.id === selectedInventoryItemId) ?? null
  }, [inventoryItems, selectedInventoryItemId])

  const adjustmentViews = useMemo<AdjustmentView[]>(() => {
    return adjustments
      .map((adjustment) => {
        const product = products.find((item) => item.id === adjustment.product_id)
        const option = variantOptions.find((item) => item.id === adjustment.variant_option_id)
        const group = variantGroups.find((item) => item.id === option?.variant_group_id)
        const inventory = inventoryItems.find((item) => item.id === adjustment.inventory_item_id)

        return {
          ...adjustment,
          productName: product?.name ?? 'Unknown product',
          variantGroupName: group?.name ?? 'Variant',
          variantOptionName: option?.name ?? 'Unknown option',
          inventoryItemName: inventory?.name ?? 'Unknown item',
          unit: inventory?.unit ?? '',
        }
      })
      .filter((row) => {
        const keyword = searchQuery.trim().toLowerCase()
        if (!keyword) return true

        return (
          row.productName.toLowerCase().includes(keyword) ||
          row.variantGroupName.toLowerCase().includes(keyword) ||
          row.variantOptionName.toLowerCase().includes(keyword) ||
          row.inventoryItemName.toLowerCase().includes(keyword)
        )
      })
  }, [adjustments, inventoryItems, products, searchQuery, variantGroups, variantOptions])

  const resetForm = () => {
    setSelectedVariantOptionId('')
    setSelectedInventoryItemId('')
    setQuantity('')
    setNotes('')
  }

  const handleSaveAdjustment = async () => {
    const parsedQuantity = Number(quantity)

    if (!selectedProductId) {
      showToast('error', 'Please select a product first.')
      return
    }

    if (!selectedVariantOptionId) {
      showToast('error', 'Please select a variant option.')
      return
    }

    if (!selectedInventoryItemId) {
      showToast('error', 'Please select an inventory item.')
      return
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity === 0) {
      showToast('error', 'Adjustment quantity must be a non-zero number.')
      return
    }

    setSaving(true)

    try {
      const { data, error } = await supabase
        .from('product_variant_recipe_adjustments')
        .upsert(
          {
            product_id: selectedProductId,
            variant_option_id: selectedVariantOptionId,
            inventory_item_id: selectedInventoryItemId,
            adjustment_quantity: parsedQuantity,
            notes: notes.trim() || null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'product_id,variant_option_id,inventory_item_id',
          },
        )
        .select('id, product_id, variant_option_id, inventory_item_id, adjustment_quantity, notes, created_at, updated_at')
        .single()

      if (error) throw error

      const savedRow = data as AdjustmentRow
      setAdjustments((current) => {
        const exists = current.some((item) => item.id === savedRow.id)
        if (exists) {
          return current.map((item) => (item.id === savedRow.id ? savedRow : item))
        }
        return [savedRow, ...current]
      })

      resetForm()
      showToast('success', 'Variant recipe adjustment saved.')
    } catch (error) {
      console.error('Failed to save adjustment:', error)
      showToast('error', getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAdjustment = async (adjustmentId: string) => {
    const confirmed = window.confirm('Delete this product variant recipe adjustment?')
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('product_variant_recipe_adjustments')
        .delete()
        .eq('id', adjustmentId)

      if (error) throw error

      setAdjustments((current) => current.filter((item) => item.id !== adjustmentId))
      showToast('success', 'Adjustment deleted.')
    } catch (error) {
      console.error('Failed to delete adjustment:', error)
      showToast('error', getErrorMessage(error))
    }
  }

  useEffect(() => {
    setSelectedVariantOptionId('')
  }, [selectedProductId])

  return (
    <div className="h-full overflow-y-auto bg-gray-50 px-4 py-4 md:px-6 md:py-6">
      <section>


        {toast ? (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
              toast.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-700'
                : toast.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-gray-200 bg-white text-gray-700'
            }`}
          >
            {toast.message}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="overflow-auto rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-gray-100 p-3">
                <BeakerIcon className="h-5 w-5 text-gray-800" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Create Adjustment</h3>
                <p className="text-sm text-gray-500">Specific to one product + one variant option.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Product</label>
                <select
                  value={selectedProductId}
                  onChange={(event) => setSelectedProductId(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                >
                  <option value="">Select product</option>
                  {productsWithVariants.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} {product.price ? `- ${formatCurrency(product.price)}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Variant Option</label>
                <select
                  value={selectedVariantOptionId}
                  onChange={(event) => setSelectedVariantOptionId(event.target.value)}
                  disabled={!selectedProductId}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition disabled:bg-gray-100 disabled:text-gray-400 focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                >
                  <option value="">
                    {selectedProductId ? 'Select variant option' : 'Select product first'}
                  </option>
                  {availableVariantOptions.map((option) => {
                    const group = variantGroups.find((item) => item.id === option.variant_group_id)
                    const priceModifier = Number(option.price_modifier ?? 0)
                    return (
                      <option key={option.id} value={option.id}>
                        {group?.name ?? 'Variant'} - {option.name}
                        {priceModifier !== 0 ? ` (${formatCurrency(priceModifier)})` : ''}
                      </option>
                    )
                  })}
                </select>
                {selectedProductId && availableVariantOptions.length === 0 ? (
                  <p className="mt-2 text-xs text-red-500">
                    This product has no assigned variant group yet. Assign variants in the menu/product form first.
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Inventory Item</label>
                <select
                  value={selectedInventoryItemId}
                  onChange={(event) => setSelectedInventoryItemId(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                >
                  <option value="">Select inventory item</option>
                  {inventoryItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Adjustment Quantity</label>
                <input
                  type="number"
                  step="0.01"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="Example: 5 or -1"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Positive value adds usage. Negative value subtracts usage. Unit:{' '}
                  <span className="font-semibold">{selectedInventoryItem?.unit ?? '-'}</span>
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="Example: Large size needs extra coffee beans."
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                />
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                <p className="font-semibold text-gray-900">How it works</p>
                <p className="mt-1">
                  The order will deduct the base recipe first, then apply these product-specific variant adjustments.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleSaveAdjustment()}
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PlusIcon className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Adjustment'}
              </button>
            </div>
          </div>

          <div className="flex flex-col rounded-lg border border-gray-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Saved Adjustments</h3>
                <p className="text-sm text-gray-500">Base recipe + these adjustments will be deducted on paid orders.</p>
              </div>

              <div className="relative w-full md:w-72">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search adjustments..."
                  className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                />
              </div>
            </div>

            <div className="p-4">
              {loading ? (
                <div className="flex h-64 items-center justify-center text-sm text-gray-500">
                  Loading product variant recipes...
                </div>
              ) : adjustmentViews.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-center">
                  <div>
                    <p className="font-semibold text-gray-900">No variant recipe adjustment yet</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Create one for cases like Americano Large = +5g coffee beans.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {adjustmentViews.map((adjustment) => (
                    <div
                      key={adjustment.id}
                      className="rounded-lg border border-gray-200 bg-white p-4 transition hover:border-gray-300"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                              {adjustment.productName}
                            </span>
                            <span className="text-xs text-gray-400">+</span>
                            <span className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white">
                              {adjustment.variantGroupName}: {adjustment.variantOptionName}
                            </span>
                          </div>
                          <p className="mt-3 text-sm font-semibold text-gray-900">
                            {adjustment.inventoryItemName}{' '}
                            <span className={adjustment.adjustment_quantity >= 0 ? 'text-green-700' : 'text-red-700'}>
                              {formatQuantity(adjustment.adjustment_quantity, adjustment.unit)}
                            </span>
                          </p>
                          {adjustment.notes ? (
                            <p className="mt-1 text-sm text-gray-500">{adjustment.notes}</p>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleDeleteAdjustment(adjustment.id)}
                          className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          aria-label="Delete adjustment"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
