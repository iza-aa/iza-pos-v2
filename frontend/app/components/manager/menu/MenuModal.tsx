'use client'

import { useEffect, useRef, useState } from 'react'
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/config/supabaseClient'
import { showError } from '@/lib/services/errorHandling'
import type { MenuItem, VariantGroup } from '@/lib/types'

interface MenuModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (menu: Omit<MenuItem, 'id'>) => void
  onUpdate?: (menu: MenuItem) => void
  editMenu?: MenuItem | null
  categories: Array<{ id: string; name: string }>
  defaultCategoryId?: string
}

type ProductType = 'food' | 'drink'

type VariantGroupRow = {
  id: string
  name: string
  type?: string | null
  is_required?: boolean | null
}

type VariantOptionRow = {
  id: string
  name: string
  price_modifier?: number | null
  price_adjustment?: number | null
}

type MenuFormData = {
  name: string
  category: string
  categoryId: string
  price: number
  image: string
  available: boolean
  hasVariants: boolean
  variantGroups: string[]
  type: ProductType
}

const normalizeProductType = (value: unknown): ProductType => {
  return value === 'drink' ? 'drink' : 'food'
}

const toSafeString = (value: unknown): string => {
  return typeof value === 'string' ? value : ''
}

const toSafeNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsedValue = Number(value)
    return Number.isFinite(parsedValue) ? parsedValue : 0
  }
  return 0
}

const toSafeBoolean = (value: unknown, fallback = false): boolean => {
  return typeof value === 'boolean' ? value : fallback
}

const getMenuVariantGroups = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

const getMenuAvailable = (menu: MenuItem | null | undefined): boolean => {
  if (!menu) return true

  const menuWithLegacyAvailability = menu as MenuItem & {
    available?: boolean
  }

  if (typeof menuWithLegacyAvailability.available === 'boolean') {
    return menuWithLegacyAvailability.available
  }

  return toSafeBoolean(menu.is_available, true)
}

const getInitialFormData = (
  categories: Array<{ id: string; name: string }>,
  defaultCategoryId?: string,
): MenuFormData => {
  const selectedCategory = defaultCategoryId
    ? categories.find((category) => category.id === defaultCategoryId) ?? categories[0]
    : categories[0]

  return {
    name: '',
    category: selectedCategory?.name ?? '',
    categoryId: selectedCategory?.id ?? '',
    price: 0,
    image: '',
    available: true,
    hasVariants: false,
    variantGroups: [],
    type: 'food',
  }
}

export default function MenuModal({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  editMenu,
  categories,
  defaultCategoryId,
}: MenuModalProps) {
  const [formData, setFormData] = useState<MenuFormData>(() =>
    getInitialFormData(categories, defaultCategoryId),
  )
  const [imagePreview, setImagePreview] = useState<string>('')
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([])
  const [loadingVariants, setLoadingVariants] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchVariantGroups = async () => {
      setLoadingVariants(true)

      try {
        const { data: groups, error: groupsError } = await supabase
          .from('variant_groups')
          .select('id, name, type, is_required')
          .order('created_at', { ascending: true })

        if (groupsError) {
          console.error('Error fetching variant groups:', groupsError)
          setVariantGroups([])
          return
        }

        const formattedGroups: VariantGroup[] = await Promise.all(
          ((groups ?? []) as VariantGroupRow[]).map(async (group) => {
            const { data: options, error: optionsError } = await supabase
              .from('variant_options')
              .select('id, name, price_modifier, price_adjustment')
              .eq('variant_group_id', group.id)
              .order('sort_order', { ascending: true })

            if (optionsError) {
              console.error(
                'Error fetching options for group:',
                group.id,
                optionsError,
              )
            }

            return {
              id: group.id,
              name: group.name,
              type: group.type === 'multiple' ? 'multiple' : 'single',
              is_required: Boolean(group.is_required),
              options: ((options ?? []) as VariantOptionRow[]).map((option) => {
                const priceAdjustment = toSafeNumber(
                  option.price_adjustment ?? option.price_modifier,
                )

                return {
                  id: option.id,
                  name: option.name,
                  price_modifier: priceAdjustment,
                  price_adjustment: priceAdjustment,
                }
              }),
            }
          }),
        )

        setVariantGroups(formattedGroups)
      } catch (error) {
        console.error('Error fetching variant groups:', error)
        setVariantGroups([])
      } finally {
        setLoadingVariants(false)
      }
    }

    if (isOpen) {
      void fetchVariantGroups()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    if (editMenu) {
      setFormData({
        name: toSafeString(editMenu.name),
        category: toSafeString(editMenu.category),
        categoryId: toSafeString(editMenu.categoryId),
        price: toSafeNumber(editMenu.price),
        image: toSafeString(editMenu.image),
        available: getMenuAvailable(editMenu),
        hasVariants: toSafeBoolean(editMenu.hasVariants, false),
        variantGroups: getMenuVariantGroups(editMenu.variantGroups),
        type: normalizeProductType(editMenu.type),
      })
      setImagePreview(toSafeString(editMenu.image))
      return
    }

    const initialFormData = getInitialFormData(categories, defaultCategoryId)
    setFormData(initialFormData)
    setImagePreview('')
  }, [editMenu, isOpen, categories, defaultCategoryId])

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      showError('Pilih file gambar yang valid')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('Ukuran gambar harus kurang dari 5MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      setImagePreview(result)
      setFormData((prev) => ({ ...prev, image: result }))
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setImagePreview('')
    setFormData((prev) => ({ ...prev, image: '' }))

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryId = event.target.value
    const selectedCategory = categories.find((category) => category.id === categoryId)

    setFormData((prev) => ({
      ...prev,
      categoryId,
      category: selectedCategory?.name ?? '',
    }))
  }

  const handleToggleVariantGroup = (variantGroupId: string) => {
    setFormData((prev) => ({
      ...prev,
      variantGroups: prev.variantGroups.includes(variantGroupId)
        ? prev.variantGroups.filter((id) => id !== variantGroupId)
        : [...prev.variantGroups, variantGroupId],
    }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const menuPayload = {
      name: formData.name.trim(),
      category: formData.category,
      categoryId: formData.categoryId,
      price: formData.price,
      image: formData.image || undefined,
      available: formData.available,
      is_available: formData.available,
      hasVariants: formData.hasVariants,
      variantGroups: formData.hasVariants ? formData.variantGroups : [],
      type: formData.type,
    }

    if (editMenu && onUpdate) {
      onUpdate({ ...menuPayload, id: editMenu.id })
    } else {
      onSave(menuPayload)
    }

    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            {editMenu ? 'Edit Menu' : 'Add Menu'}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 transition hover:bg-gray-100"
            aria-label="Close menu modal"
          >
            <XMarkIcon className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Menu Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, name: event.target.value }))
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter menu name"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                required
                value={formData.categoryId}
                onChange={handleCategoryChange}
                className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Product Type
              </label>
              <select
                required
                value={formData.type}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    type: normalizeProductType(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="food">Food (Kitchen)</option>
                <option value="drink">Drink (Barista/Waiter)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Food orders go to kitchen, drinks are handled by barista/waiter
              </p>
            </div>

            <div>
              <label
                htmlFor="price"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Price (Rp)
              </label>
              <input
                id="price"
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    price: toSafeNumber(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter price"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Menu Image
              </label>

              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Menu preview"
                    className="h-48 w-full rounded-xl border-2 border-gray-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute right-2 top-2 rounded-full bg-red-500 p-2 text-white shadow-lg transition hover:bg-red-600"
                    aria-label="Remove image"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed border-gray-300 p-8 text-center transition hover:border-blue-500 hover:bg-blue-50"
                >
                  <PhotoIcon className="mx-auto mb-2 h-12 w-12 text-gray-400" />
                  <p className="mb-1 text-sm text-gray-600">
                    Click to upload menu image
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="available"
                checked={formData.available}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    available: event.target.checked,
                  }))
                }
                className="h-5 w-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <label htmlFor="available" className="text-sm font-medium text-gray-700">
                Available for sale
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="hasVariantsMenu"
                checked={formData.hasVariants}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    hasVariants: event.target.checked,
                    variantGroups: event.target.checked ? prev.variantGroups : [],
                  }))
                }
                className="h-5 w-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <label
                htmlFor="hasVariantsMenu"
                className="text-sm font-medium text-gray-700"
              >
                This menu has variants
              </label>
            </div>

            {formData.hasVariants && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <label className="mb-3 block text-sm font-medium text-gray-700">
                  Select Variant Groups
                </label>

                {loadingVariants ? (
                  <div className="py-8 text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
                    <p className="mt-2 text-sm text-gray-500">
                      Loading variant groups...
                    </p>
                  </div>
                ) : (
                  <div className="max-h-60 space-y-2 overflow-y-auto">
                    {variantGroups.map((group) => {
                      const optionCount = group.options?.length ?? 0

                      return (
                        <div
                          key={group.id}
                          className="flex items-start gap-3 rounded-lg bg-white p-2"
                        >
                          <input
                            type="checkbox"
                            id={`variant-${group.id}`}
                            checked={formData.variantGroups.includes(group.id)}
                            onChange={() => handleToggleVariantGroup(group.id)}
                            className="mt-0.5 h-5 w-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                          />

                          <div className="flex-1">
                            <label
                              htmlFor={`variant-${group.id}`}
                              className="cursor-pointer text-sm font-medium text-gray-700"
                            >
                              {group.name}
                              {group.is_required && (
                                <span className="ml-1 text-red-500">*</span>
                              )}
                            </label>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {optionCount} option{optionCount !== 1 ? 's' : ''} •{' '}
                              {group.type === 'single'
                                ? 'Single select'
                                : 'Multiple select'}
                            </p>
                          </div>
                        </div>
                      )
                    })}

                    {variantGroups.length === 0 && (
                      <div className="py-4 text-center">
                        <p className="mb-2 text-sm text-gray-500">
                          No variant groups available
                        </p>
                        <p className="text-xs text-gray-400">
                          Go to Variants page to create variant groups first
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-2 font-medium transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-blue-500 px-4 py-2 font-medium text-white transition hover:bg-blue-600"
            >
              {editMenu ? 'Update' : 'Add'} Menu
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}