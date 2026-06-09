'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  PhotoIcon,
  Squares2X2Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/config/supabaseClient'
import { showError } from '@/lib/services/errorHandling'
import { useLanguage } from '@/app/components/shared/i18n'
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
  required?: boolean | null
}

type VariantOptionRow = {
  id: string
  name: string
  price_modifier?: number | string | null
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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}


const MENU_IMAGE_MAX_DIMENSION = 1200
const MENU_IMAGE_TARGET_SIZE_BYTES = 320 * 1024
const MENU_IMAGE_MAX_SIZE_BYTES = 680 * 1024

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) => {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('manager.menu.modal.imageCompressFailed'))
          return
        }

        resolve(blob)
      },
      'image/webp',
      quality,
    )
  })
}

const loadImageElement = (file: File) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('manager.menu.modal.imageReadFailed'))
    }

    image.src = objectUrl
  })
}

const compressMenuImage = async (file: File) => {
  const image = await loadImageElement(file)
  const scale = Math.min(1, MENU_IMAGE_MAX_DIMENSION / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Browser does not support image compression.')
  }

  canvas.width = width
  canvas.height = height
  context.drawImage(image, 0, 0, width, height)

  let quality = 0.86
  let blob = await canvasToBlob(canvas, quality)

  while (blob.size > MENU_IMAGE_TARGET_SIZE_BYTES && quality > 0.45) {
    quality -= 0.08
    blob = await canvasToBlob(canvas, quality)
  }

  if (blob.size > MENU_IMAGE_MAX_SIZE_BYTES) {
    throw new Error('manager.menu.modal.imageTooLarge')
  }

  const compressedFileName = `${file.name.replace(/\.[^.]+$/, '') || 'menu-image'}.webp`

  return new File([blob], compressedFileName, {
    type: 'image/webp',
    lastModified: Date.now(),
  })
}

type MenuImageUploadResponse = {
  success?: boolean
  image_url?: string
  error?: string
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
  const { t } = useLanguage()
  const [formData, setFormData] = useState<MenuFormData>(() =>
    getInitialFormData(categories, defaultCategoryId),
  )
  const [imagePreview, setImagePreview] = useState<string>('')
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([])
  const [loadingVariants, setLoadingVariants] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchVariantGroups = async () => {
      setLoadingVariants(true)

      try {
        const { data: groups, error: groupsError } = await supabase
          .from('variant_groups')
          .select('id, name, type, required')
          .eq('is_active', true)
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
              .select('id, name, price_modifier')
              .eq('variant_group_id', group.id)
              .eq('is_active', true)
              .order('sort_order', { ascending: true })

            if (optionsError) {
              console.error('Error fetching options for group:', group.id, optionsError)
            }

            return {
              id: group.id,
              name: group.name,
              type: group.type === 'multiple' ? 'multiple' : 'single',
              is_required: Boolean(group.required),
              options: ((options ?? []) as VariantOptionRow[]).map((option) => {
                const priceAdjustment = toSafeNumber(option.price_modifier)

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

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      showError(t('manager.menu.modal.invalidImage'))
      return
    }

    setUploadingImage(true)

    try {
      const compressedFile = await compressMenuImage(file)
      const uploadFormData = new FormData()
      uploadFormData.append('file', compressedFile)
      uploadFormData.append('menu_name', formData.name || editMenu?.name || 'menu-item')
      uploadFormData.append('menu_id', editMenu?.id ?? '')

      const response = await fetch('/api/staff/menu/photo', {
        method: 'POST',
        body: uploadFormData,
      })

      const result = (await response.json()) as MenuImageUploadResponse

      if (!response.ok || !result.success || !result.image_url) {
        throw new Error(result.error || 'manager.menu.modal.imageUploadFailed')
      }

      setImagePreview(result.image_url)
      setFormData((prev) => ({ ...prev, image: result.image_url ?? '' }))
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message.startsWith('manager.')
            ? t(error.message)
            : error.message
          : t('manager.menu.modal.imageUploadFailed')
      showError(message)
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex shrink-0 items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {editMenu ? t('manager.menu.modal.editTitle') : t('manager.menu.modal.addTitle')}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {t('manager.menu.modal.subtitle')}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close menu modal"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="rounded-lg bg-gray-100 p-2">
                      <Squares2X2Icon className="h-5 w-5 text-gray-700" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Menu Details</h3>
                      <p className="text-xs text-gray-500">Basic product information.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        {t('manager.menu.modal.menuName')}
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, name: event.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
                        placeholder={t('manager.menu.modal.menuNamePlaceholder')}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          {t('manager.menu.modal.category')}
                        </label>
                        <select
                          required
                          value={formData.categoryId}
                          onChange={handleCategoryChange}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
                        >
                          <option value="">{t('manager.menu.modal.selectCategory')}</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          {t('manager.menu.modal.productType')}
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
                          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
                        >
                          <option value="food">{t('manager.menu.modal.food')}</option>
                          <option value="drink">{t('manager.menu.modal.drink')}</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="price" className="mb-2 block text-sm font-medium text-gray-700">
                        {t('manager.menu.modal.price')}
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
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-900 focus:outline-none"
                        placeholder="Enter price"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Current price: <span className="font-medium">{formatCurrency(formData.price)}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <label className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{t('manager.menu.modal.availableForSale')}</p>
                          <p className="text-xs text-gray-500">{t('manager.menu.modal.availableHelp')}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={formData.available}
                          onChange={(event) =>
                            setFormData((prev) => ({
                              ...prev,
                              available: event.target.checked,
                            }))
                          }
                          className="h-5 w-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                        />
                      </label>

                      <label className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{t('manager.menu.modal.hasVariants')}</p>
                          <p className="text-xs text-gray-500">{t('manager.menu.modal.hasVariantsHelp')}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={formData.hasVariants}
                          onChange={(event) =>
                            setFormData((prev) => ({
                              ...prev,
                              hasVariants: event.target.checked,
                              variantGroups: event.target.checked ? prev.variantGroups : [],
                            }))
                          }
                          className="h-5 w-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {formData.hasVariants && (
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">{t('manager.menu.modal.variantGroups')}</h3>
                        <p className="text-xs text-gray-500">
                          {t('manager.menu.modal.variantGroupsHelp')}
                        </p>
                      </div>
                      <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                        {t('manager.menu.modal.selectedCount', { count: formData.variantGroups.length })}
                      </span>
                    </div>

                    {loadingVariants ? (
                      <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center">
                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
                        <p className="mt-2 text-sm text-gray-500">{t('manager.menu.modal.loadingVariantGroups')}</p>
                      </div>
                    ) : (
                      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                        {variantGroups.map((group) => {
                          const optionCount = group.options?.length ?? 0
                          const checked = formData.variantGroups.includes(group.id)

                          return (
                            <button
                              type="button"
                              key={group.id}
                              onClick={() => handleToggleVariantGroup(group.id)}
                              className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                                checked
                                  ? 'border-gray-900 bg-gray-50'
                                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <div
                                className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${
                                  checked ? 'border-gray-900 bg-gray-900' : 'border-gray-300 bg-white'
                                }`}
                              >
                                {checked ? <CheckCircleIcon className="h-4 w-4 text-white" /> : null}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-medium text-gray-800">
                                    {group.name}
                                  </p>
                                  {group.is_required ? (
                                    <span className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                                      {t('manager.menu.modal.required')}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-0.5 text-xs text-gray-500">
                                  {t('manager.menu.modal.optionCount', { count: optionCount })} •{' '}
                                  {group.type === 'single'
                                    ? t('manager.menu.modal.singleSelect')
                                    : t('manager.menu.modal.multipleSelect')}
                                </p>
                              </div>
                            </button>
                          )
                        })}

                        {variantGroups.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-gray-200 py-6 text-center">
                            <p className="text-sm font-medium text-gray-600">{t('manager.menu.modal.noVariantGroups')}</p>
                            <p className="mt-1 text-xs text-gray-400">
                              {t('manager.menu.modal.noVariantGroupsHelp')}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">{t('manager.menu.modal.menuImage')}</h3>

                  {imagePreview ? (
                    <div className="relative overflow-hidden rounded-lg border border-gray-200">
                      <img
                        src={imagePreview}
                        alt="Menu preview"
                        className="h-64 w-full object-cover"
                      />

                      {uploadingImage ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 text-white">
                          <ArrowPathIcon className="h-7 w-7 animate-spin" />
                          <p className="mt-2 text-sm font-medium">{t('manager.menu.modal.uploadingImage')}</p>
                        </div>
                      ) : null}

                      <div className="absolute right-3 top-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-white"
                          aria-label={t('manager.menu.modal.changeImage')}
                          disabled={uploadingImage}
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="rounded-lg bg-white/90 p-2 text-gray-700 shadow-sm transition hover:bg-white"
                          aria-label={t('manager.menu.modal.removeImage')}
                          disabled={uploadingImage}
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="flex h-64 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-center transition hover:border-gray-400 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {uploadingImage ? (
                        <>
                          <ArrowPathIcon className="mb-2 h-10 w-10 animate-spin text-gray-500" />
                          <p className="text-sm font-medium text-gray-700">{t('manager.menu.modal.uploadingImage')}</p>
                          <p className="mt-1 text-xs text-gray-500">{t('manager.menu.modal.compressingImage')}</p>
                        </>
                      ) : (
                        <>
                          <PhotoIcon className="mb-2 h-10 w-10 text-gray-400" />
                          <p className="text-sm font-medium text-gray-700">{t('manager.menu.modal.uploadMenuImage')}</p>
                          <p className="mt-1 text-xs text-gray-500">{t('manager.menu.modal.uploadImageHelp')}</p>
                        </>
                      )}
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

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h3 className="text-sm font-semibold text-gray-900">Summary</h3>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Status</span>
                      <span className="font-medium text-gray-900">
                        {formData.available
                          ? t('manager.menu.available')
                          : t('manager.menu.unavailable')}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Type</span>
                      <span className="font-medium capitalize text-gray-900">{formData.type}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">{t('manager.menu.modal.variants')}</span>
                      <span className="font-medium text-gray-900">
                        {formData.hasVariants
                          ? t('manager.menu.modal.groupCount', { count: formData.variantGroups.length })
                          : t('manager.menu.modal.noVariants')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={uploadingImage}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploadingImage
                ? t('manager.menu.modal.uploadingImageButton')
                : editMenu
                  ? t('manager.menu.modal.updateMenu')
                  : t('manager.menu.modal.addMenu')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
