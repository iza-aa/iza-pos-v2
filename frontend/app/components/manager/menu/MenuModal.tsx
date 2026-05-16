'use client'

import { useEffect, useRef, useState } from 'react'
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/config/supabaseClient'
import { showError } from '@/lib/services/errorHandling'
import type { MenuItem, VariantGroup } from '@/lib/types'

type MenuType = 'food' | 'drink'
type VariantSelectionType = 'single' | 'multiple'

type CategoryOption = {
  id: string
  name: string
}

type MenuFormData = {
  name: string
  category: string
  categoryId: string
  price: number
  image: string
  available: boolean
  is_available: boolean
  hasVariants: boolean
  variantGroups: string[]
  type: MenuType
}

type RawVariantGroup = {
  id: string
  name: string
  type?: string | null
  is_required?: boolean | null
}

type RawVariantOption = {
  id: string
  name: string
  price_modifier?: number | string | null
  price_adjustment?: number | string | null
}

interface MenuModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (menu: Omit<MenuItem, 'id'>) => void
  onUpdate?: (menu: MenuItem) => void
  editMenu?: MenuItem | null
  categories: CategoryOption[]
  defaultCategoryId?: string
}

const normalizeMenuType = (value: unknown): MenuType => {
  return value === 'drink' ? 'drink' : 'food'
}

const normalizeString = (value: unknown): string => {
  return typeof value === 'string' ? value : ''
}

const normalizeNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const normalizeBoolean = (value: unknown, fallback = false): boolean => {
  return typeof value === 'boolean' ? value : fallback
}

const normalizeVariantGroupIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => (typeof item === 'string' ? item : ''))
    .filter(Boolean)
}

const buildMenuPayload = (formData: MenuFormData): Omit<MenuItem, 'id'> => {
  const image = formData.image.trim()

  return {
    name: formData.name.trim(),
    category: formData.category,
    categoryId: formData.categoryId,
    price: formData.price,
    image: image || undefined,
    available: formData.available,
    is_available: formData.available,
    hasVariants: formData.hasVariants,
    variantGroups: formData.hasVariants ? formData.variantGroups : [],
    type: formData.type,
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
  const [formData, setFormData] = useState<MenuFormData>({
    name: '',
    category: '',
    categoryId: '',
    price: 0,
    image: '',
    available: true,
    is_available: true,
    hasVariants: false,
    variantGroups: [],
    type: 'food',
  })

  const [imagePreview, setImagePreview] = useState('')
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
          ((groups ?? []) as RawVariantGroup[]).map(async (group) => {
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
              is_required: normalizeBoolean(group.is_required),
              options: ((options ?? []) as RawVariantOption[]).map((option) => {
                const priceAdjustment = normalizeNumber(
                  option.price_adjustment ?? option.price_modifier,
                )

                return {
                  id: option.id,
                  name: option.name,
                  price_adjustment: priceAdjustment,
                  price_modifier: priceAdjustment,
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
      const image = normalizeString(editMenu.image)
      const available = normalizeBoolean(
        editMenu.available,
        normalizeBoolean(editMenu.is_available, true),
      )

      setFormData({
        name: normalizeString(editMenu.name),
        category: normalizeString(editMenu.category),
        categoryId: normalizeString(editMenu.categoryId),
        price: normalizeNumber(editMenu.price),
        image,
        available,
        is_available: available,
        hasVariants: normalizeBoolean(editMenu.hasVariants),
        variantGroups: normalizeVariantGroupIds(editMenu.variantGroups),
        type: normalizeMenuType(editMenu.type),
      })

      setImagePreview(image)
      return
    }

    if (categories.length > 0) {
      const selectedCategory =
        (defaultCategoryId
          ? categories.find((category) => category.id === defaultCategoryId)
          : undefined) ?? categories[0]

      setFormData({
        name: '',
        category: selectedCategory.name,
        categoryId: selectedCategory.id,
        price: 0,
        image: '',
        available: true,
        is_available: true,
        hasVariants: false,
        variantGroups: [],
        type: 'food',
      })
      setImagePreview('')
    }
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
    const selectedCategory = categories.find(
      (category) => category.id === categoryId,
    )

    if (!selectedCategory) {
      setFormData((prev) => ({
        ...prev,
        categoryId: '',
        category: '',
      }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      categoryId,
      category: selectedCategory.name,
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

  const handleAvailableChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      available: checked,
      is_available: checked,
    }))
  }

  const handleHasVariantsChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      hasVariants: checked,
      variantGroups: checked ? prev.variantGroups : [],
    }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const payload = buildMenuPayload(formData)

    if (editMenu && onUpdate) {
      onUpdate({
        ...payload,
        id: editMenu.id,
      })
    } else {
      onSave(payload)
    }

    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">
            {editMenu ? 'Edit Menu' : 'Add Menu'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="Close menu modal"
          >
            <XMarkIcon className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Menu Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, name: event.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter menu name"
              />
            </div>

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
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Type
              </label>
              <select
                required
                value={formData.type}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    type: normalizeMenuType(event.target.value),
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="food">Food (Kitchen)</option>
                <option value="drink">Drink (Barista/Waiter)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Food orders go to kitchen, drinks are handled by barista/waiter
              </p>
            </div>

            <div>
              <label
                htmlFor="price"
                className="block text-sm font-medium text-gray-700 mb-2"
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
                    price: normalizeNumber(event.target.value),
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter price"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Menu Image
              </label>

              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Menu preview"
                    className="w-full h-48 object-cover rounded-xl border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow-lg"
                    aria-label="Remove menu image"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition"
                >
                  <PhotoIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-1">
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
                onChange={(event) => handleAvailableChange(event.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <label
                htmlFor="available"
                className="text-sm font-medium text-gray-700"
              >
                Available for sale
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="hasVariantsMenu"
                checked={formData.hasVariants}
                onChange={(event) =>
                  handleHasVariantsChange(event.target.checked)
                }
                className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <label
                htmlFor="hasVariantsMenu"
                className="text-sm font-medium text-gray-700"
              >
                This menu has variants
              </label>
            </div>

            {formData.hasVariants && (
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Variant Groups
                </label>
                {loadingVariants ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
                    <p className="text-sm text-gray-500 mt-2">
                      Loading variant groups...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {variantGroups.map((group) => {
                      const options = group.options ?? []

                      return (
                        <div
                          key={group.id}
                          className="flex items-start gap-3 p-2 bg-white rounded-lg"
                        >
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
                              {group.is_required && (
                                <span className="ml-1 text-red-500">*</span>
                              )}
                            </label>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {options.length} option
                              {options.length !== 1 ? 's' : ''} •{' '}
                              {group.type === 'single'
                                ? 'Single select'
                                : 'Multiple select'}
                            </p>
                          </div>
                        </div>
                      )
                    })}

                    {variantGroups.length === 0 && (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500 mb-2">
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
              {editMenu ? 'Update' : 'Add'} Menu
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}