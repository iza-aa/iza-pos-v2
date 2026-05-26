'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircleIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import type { VariantGroup, VariantOption } from '@/lib/types'

interface VariantGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (group: Omit<VariantGroup, 'id'>) => void
  onUpdate?: (group: VariantGroup) => void
  editGroup?: VariantGroup | null
}

type VariantGroupType = 'single' | 'multiple'

type VariantOptionValue = VariantOption & {
  price_adjustment: number
  price_modifier: number
  priceModifier: number
}

type VariantGroupFormData = Omit<VariantGroup, 'id' | 'options'> & {
  name: string
  type: VariantGroupType
  required: boolean
  is_required: boolean
  options: VariantOptionValue[]
}

type NewOptionState = {
  name: string
  priceModifier: number
}

const createEmptyForm = (): VariantGroupFormData => ({
  name: '',
  type: 'single',
  required: false,
  is_required: false,
  options: [],
})

const normalizeNumber = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeGroupType = (value: unknown): VariantGroupType => {
  return value === 'multiple' ? 'multiple' : 'single'
}

const normalizeOption = (option: VariantOption): VariantOptionValue => {
  const optionValue = option as VariantOptionValue
  const priceModifier = normalizeNumber(
    optionValue.priceModifier ?? optionValue.price_modifier ?? option.price_adjustment,
  )

  return {
    ...option,
    id: String(option.id),
    name: String(option.name ?? ''),
    price_adjustment: priceModifier,
    price_modifier: priceModifier,
    priceModifier,
  }
}

const normalizeOptions = (options: VariantGroup['options']): VariantOptionValue[] => {
  return Array.isArray(options) ? options.map(normalizeOption) : []
}

const normalizeGroup = (group: VariantGroup | null | undefined): VariantGroupFormData => {
  if (!group) return createEmptyForm()

  const groupValue = group as VariantGroup & { is_required?: boolean | null }
  const required = Boolean(groupValue.required ?? groupValue.is_required ?? false)

  return {
    name: String(group.name ?? ''),
    type: normalizeGroupType(group.type),
    required,
    is_required: required,
    options: normalizeOptions(group.options),
  }
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

const formatPriceModifier = (value: number): string => {
  if (value === 0) return 'No extra charge'

  const prefix = value > 0 ? '+' : '-'
  return `${prefix}${formatCurrency(Math.abs(value))}`
}

export default function VariantGroupModal({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  editGroup,
}: VariantGroupModalProps) {
  const [formData, setFormData] = useState<VariantGroupFormData>(createEmptyForm)
  const [newOption, setNewOption] = useState<NewOptionState>({ name: '', priceModifier: 0 })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return

    setFormData(normalizeGroup(editGroup))
    setNewOption({ name: '', priceModifier: 0 })
    setError('')
  }, [editGroup, isOpen])

  const optionCount = formData.options.length

  const optionNameExists = useMemo(() => {
    const normalizedName = newOption.name.trim().toLowerCase()
    if (!normalizedName) return false

    return formData.options.some(
      (option) => option.name.trim().toLowerCase() === normalizedName,
    )
  }, [formData.options, newOption.name])

  const updateRequired = (required: boolean) => {
    setFormData((previous) => ({
      ...previous,
      required,
      is_required: required,
    }))
  }

  const handleAddOption = () => {
    const optionName = newOption.name.trim()

    if (!optionName) {
      setError('Option name is required.')
      return
    }

    if (optionNameExists) {
      setError('This option already exists in the group.')
      return
    }

    const priceModifier = normalizeNumber(newOption.priceModifier)
    const option: VariantOptionValue = {
      id: `temp-${Date.now()}`,
      name: optionName,
      price_adjustment: priceModifier,
      price_modifier: priceModifier,
      priceModifier,
    }

    setFormData((previous) => ({
      ...previous,
      options: [...previous.options, option],
    }))
    setNewOption({ name: '', priceModifier: 0 })
    setError('')
  }

  const handleRemoveOption = (optionId: string) => {
    setFormData((previous) => ({
      ...previous,
      options: previous.options.filter((option) => option.id !== optionId),
    }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = formData.name.trim()

    if (!trimmedName) {
      setError('Group name is required.')
      return
    }

    if (formData.options.length === 0) {
      setError('Add at least one option before saving.')
      return
    }

    const payload: Omit<VariantGroup, 'id'> = {
      ...formData,
      name: trimmedName,
      options: formData.options.map((option) => ({
        ...option,
        name: option.name.trim(),
        price_adjustment: normalizeNumber(option.price_adjustment),
        price_modifier: normalizeNumber(option.price_modifier),
        priceModifier: normalizeNumber(option.priceModifier),
      })) as VariantOption[],
    }

    if (editGroup && onUpdate) {
      onUpdate({ ...payload, id: editGroup.id })
    } else {
      onSave(payload)
    }

    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {editGroup ? 'Edit Variant Group' : 'Add Variant Group'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Create selectable menu options such as size, sugar level, ice level, or add-ons.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-hidden">
          <div className="grid h-full grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[1.05fr_0.95fr]">
            <div className="min-h-0 overflow-y-auto border-b border-gray-200 p-5 lg:border-b-0 lg:border-r">
              <div className="space-y-4">
                {error ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                ) : null}

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Group Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(event) =>
                      setFormData((previous) => ({ ...previous, name: event.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                    placeholder="e.g. Size, Sugar Level, Toppings"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Selection Type
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((previous) => ({ ...previous, type: 'single' }))
                      }
                      className={`rounded-lg border p-4 text-left transition ${
                        formData.type === 'single'
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">Single Select</p>
                          <p
                            className={`mt-1 text-xs ${
                              formData.type === 'single' ? 'text-gray-200' : 'text-gray-500'
                            }`}
                          >
                            Customer can choose one option only.
                          </p>
                        </div>
                        {formData.type === 'single' ? (
                          <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
                        ) : null}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setFormData((previous) => ({ ...previous, type: 'multiple' }))
                      }
                      className={`rounded-lg border p-4 text-left transition ${
                        formData.type === 'multiple'
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">Multiple Select</p>
                          <p
                            className={`mt-1 text-xs ${
                              formData.type === 'multiple' ? 'text-gray-200' : 'text-gray-500'
                            }`}
                          >
                            Customer can choose more than one option.
                          </p>
                        </div>
                        {formData.type === 'multiple' ? (
                          <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
                        ) : null}
                      </div>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => updateRequired(!formData.required)}
                  className={`w-full rounded-lg border p-4 text-left transition ${
                    formData.required
                      ? 'border-gray-900 bg-gray-100'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${
                        formData.required
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {formData.required ? <CheckCircleIcon className="h-4 w-4" /> : null}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Required Option</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Customer must select an option from this group before adding the item.
                      </p>
                    </div>
                  </div>
                </button>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Add Option</p>
                      <p className="text-xs text-gray-500">Set option name and optional price modifier.</p>
                    </div>
                    <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
                      {optionCount} option{optionCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_150px_auto]">
                    <input
                      type="text"
                      value={newOption.name}
                      onChange={(event) =>
                        setNewOption((previous) => ({ ...previous, name: event.target.value }))
                      }
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      placeholder="e.g. Small, Medium, Large"
                    />

                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500">
                        Rp
                      </span>
                      <input
                        type="number"
                        value={newOption.priceModifier}
                        onChange={(event) =>
                          setNewOption((previous) => ({
                            ...previous,
                            priceModifier: normalizeNumber(event.target.value),
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                        placeholder="0"
                        step="500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-h-0 overflow-hidden bg-gray-50 p-5">
              <div className="flex h-full min-h-[420px] flex-col rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Options Preview</p>
                      <p className="text-xs text-gray-500">Review all options before saving.</p>
                    </div>
                    <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                      {optionCount}
                    </span>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  {formData.options.length > 0 ? (
                    <div className="space-y-2">
                      {formData.options.map((option, index) => {
                        const priceModifier = normalizeNumber(option.priceModifier)

                        return (
                          <div
                            key={option.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 transition hover:border-gray-300"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-700">
                                {index + 1}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-gray-900">
                                  {option.name}
                                </p>
                                <p
                                  className={`text-xs font-medium ${
                                    priceModifier > 0
                                      ? 'text-green-700'
                                      : priceModifier < 0
                                        ? 'text-red-700'
                                        : 'text-gray-500'
                                  }`}
                                >
                                  {formatPriceModifier(priceModifier)}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveOption(option.id)}
                              className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                              aria-label={`Remove ${option.name}`}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-white ring-1 ring-gray-200">
                        <PlusIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-sm font-semibold text-gray-900">No options yet</p>
                      <p className="mt-1 max-w-xs text-xs text-gray-500">
                        Add choices such as Small, Medium, Large, Less Sugar, or Extra Cheese.
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 px-4 py-3">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-gray-50 px-2 py-2">
                      <p className="font-semibold text-gray-900">{formData.type === 'single' ? 'Single' : 'Multiple'}</p>
                      <p className="text-gray-500">Type</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-2 py-2">
                      <p className="font-semibold text-gray-900">{formData.required ? 'Required' : 'Optional'}</p>
                      <p className="text-gray-500">Rule</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-2 py-2">
                      <p className="font-semibold text-gray-900">{optionCount}</p>
                      <p className="text-gray-500">Options</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              {editGroup ? 'Save Changes' : 'Create Variant Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
