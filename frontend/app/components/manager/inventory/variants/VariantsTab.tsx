'use client'

import { useEffect, useState } from 'react'
import { useSessionValidation } from '@/lib/hooks/useSessionValidation'
import {
  PencilIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/config/supabaseClient'
import { formatPriceModifier } from '@/lib/utils'
import VariantGroupModal from './VariantGroupModal'
import { DeleteModal } from '@/app/components/ui'
import { useLanguage } from '@/app/components/shared/i18n'
import type { VariantGroup, VariantOption } from '@/lib/types'

type RawVariantOption = {
  id: string
  name: string
  price_modifier: number | string | null
  price_adjustment?: number | string | null
}

type RawVariantGroup = {
  id: string
  name: string
  type: string | null
  required: boolean | null
  is_required?: boolean | null
  variant_options?: RawVariantOption[] | null
}

type VariantOptionValue = VariantOption & {
  priceModifier?: number
  price_modifier?: number
}

type VariantGroupValue = VariantGroup & {
  required?: boolean
  is_required?: boolean
  options: VariantOptionValue[]
}

const normalizeGroupType = (value: unknown): 'single' | 'multiple' => {
  return value === 'multiple' ? 'multiple' : 'single'
}

const normalizeNumber = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const getGroupRequired = (group: VariantGroup): boolean => {
  const value = group as VariantGroupValue
  return Boolean(value.required ?? value.is_required ?? false)
}

const getGroupOptions = (group: VariantGroup): VariantOptionValue[] => {
  const value = group as VariantGroupValue
  return Array.isArray(value.options) ? value.options : []
}

const getOptionPriceModifier = (option: VariantOption): number => {
  const value = option as VariantOptionValue
  return normalizeNumber(
    value.priceModifier ?? value.price_modifier ?? value.price_adjustment,
  )
}

const normalizeVariantOption = (option: RawVariantOption): VariantOptionValue => {
  const priceAdjustment = normalizeNumber(
    option.price_adjustment ?? option.price_modifier,
  )

  return {
    id: String(option.id),
    name: String(option.name ?? ''),
    price_adjustment: priceAdjustment,
    price_modifier: priceAdjustment,
    priceModifier: priceAdjustment,
  } as VariantOptionValue
}

const normalizeVariantGroup = (group: RawVariantGroup): VariantGroup => {
  const required = Boolean(group.required ?? group.is_required ?? false)
  const options = Array.isArray(group.variant_options)
    ? group.variant_options.map(normalizeVariantOption)
    : []

  return {
    id: String(group.id),
    name: String(group.name ?? ''),
    type: normalizeGroupType(group.type),
    required,
    is_required: required,
    options,
  } as VariantGroup
}

export default function VariantsTab() {
  useSessionValidation()
  const { t } = useLanguage()

  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddGroupModal, setShowAddGroupModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<VariantGroup | null>(null)
  const [deletingGroup, setDeletingGroup] = useState<VariantGroup | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchVariantGroups = async () => {
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('variant_groups')
        .select(
          `
          *,
          variant_options(*)
        `,
        )
        .order('name', { ascending: true })

      if (error) {
        throw error
      }

      const normalizedGroups = ((data ?? []) as RawVariantGroup[]).map(
        normalizeVariantGroup,
      )

      setVariantGroups(normalizedGroups)
    } catch (error) {
      console.error('Error fetching variant groups:', error)
      setVariantGroups([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchVariantGroups()
  }, [])

  const filteredGroups = variantGroups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const totalOptions = variantGroups.reduce(
    (sum, group) => sum + getGroupOptions(group).length,
    0,
  )

  const handleAddVariantGroup = () => {
    setShowAddGroupModal(true)
    setEditingGroup(null)
  }

  const handleEditGroup = (group: VariantGroup) => {
    setEditingGroup(group)
  }

  const handleSaveNewGroup = async (newGroup: Omit<VariantGroup, 'id'>) => {
    const groupValue = newGroup as Omit<VariantGroupValue, 'id'>
    const options = Array.isArray(groupValue.options) ? groupValue.options : []
    const required = Boolean(groupValue.required ?? groupValue.is_required ?? false)

    const { data: groupData, error: groupError } = await supabase
      .from('variant_groups')
      .insert([
        {
          name: newGroup.name,
          type: normalizeGroupType(newGroup.type),
          required,
        },
      ])
      .select()
      .single()

    if (groupError) {
      console.error('Error saving variant group:', groupError)
      return
    }

    if (!groupData) return

    let normalizedOptions: VariantOptionValue[] = []

    if (options.length > 0) {
      const { data: optionsData, error: optionsError } = await supabase
        .from('variant_options')
        .insert(
          options.map((option) => ({
            variant_group_id: groupData.id,
            name: option.name,
            price_modifier: getOptionPriceModifier(option),
          })),
        )
        .select()

      if (optionsError) {
        console.error('Error saving variant options:', optionsError)
      }

      normalizedOptions = ((optionsData ?? []) as RawVariantOption[]).map(
        normalizeVariantOption,
      )
    }

    const group = {
      id: String(groupData.id),
      name: String(groupData.name ?? newGroup.name),
      type: normalizeGroupType(groupData.type ?? newGroup.type),
      required: Boolean(groupData.required ?? required),
      is_required: Boolean(groupData.required ?? required),
      options: normalizedOptions,
    } as VariantGroup

    setVariantGroups((prev) => [...prev, group])
    setShowAddGroupModal(false)
  }

  const handleUpdateGroup = async (updatedGroup: VariantGroup) => {
    const groupValue = updatedGroup as VariantGroupValue
    const options = getGroupOptions(updatedGroup)
    const required = getGroupRequired(updatedGroup)

    const { error: groupError } = await supabase
      .from('variant_groups')
      .update({
        name: updatedGroup.name,
        type: normalizeGroupType(updatedGroup.type),
        required,
      })
      .eq('id', updatedGroup.id)

    if (groupError) {
      console.error('Error updating variant group:', groupError)
      return
    }

    const { error: deleteOptionsError } = await supabase
      .from('variant_options')
      .delete()
      .eq('variant_group_id', updatedGroup.id)

    if (deleteOptionsError) {
      console.error('Error deleting old variant options:', deleteOptionsError)
      return
    }

    let normalizedOptions = options

    if (options.length > 0) {
      const { data: optionsData, error: insertOptionsError } = await supabase
        .from('variant_options')
        .insert(
          options.map((option) => ({
            variant_group_id: updatedGroup.id,
            name: option.name,
            price_modifier: getOptionPriceModifier(option),
          })),
        )
        .select()

      if (insertOptionsError) {
        console.error('Error inserting updated variant options:', insertOptionsError)
        return
      }

      normalizedOptions = ((optionsData ?? []) as RawVariantOption[]).map(
        normalizeVariantOption,
      )
    }

    const normalizedGroup = {
      ...groupValue,
      required,
      is_required: required,
      options: normalizedOptions,
    } as VariantGroup

    setVariantGroups((prev) =>
      prev.map((group) =>
        group.id === updatedGroup.id ? normalizedGroup : group,
      ),
    )
    setEditingGroup(null)
  }

  const handleDeleteGroup = (group: VariantGroup) => {
    setDeletingGroup(group)
  }

  const confirmDeleteGroup = async () => {
    if (!deletingGroup) return

    const { error } = await supabase
      .from('variant_groups')
      .delete()
      .eq('id', deletingGroup.id)

    if (error) {
      console.error('Error deleting variant group:', error)
      return
    }

    setVariantGroups((prev) =>
      prev.filter((group) => group.id !== deletingGroup.id),
    )
    setDeletingGroup(null)
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 px-4 py-4 md:px-6 md:py-6">
      <section>
        <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg md:text-xl font-bold text-gray-900">
              {t('manager.inventory.variants.title')}
            </h2>
            <p className="text-xs md:text-sm text-gray-500">
              {t('manager.inventory.variants.subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1 lg:flex-none">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('manager.inventory.variants.searchPlaceholder')}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 md:pl-10 lg:w-64"
              />
            </div>

            <button
              type="button"
              onClick={handleAddVariantGroup}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              <PlusIcon className="w-4 h-4 md:w-5 md:h-5" />
              {t('manager.inventory.variants.addNewGroup')}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:mt-6 md:gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{t('manager.inventory.variants.totalGroups')}</p>
              <p className="mt-3 text-2xl font-bold text-gray-950">{variantGroups.length}</p>
              <p className="mt-2 text-sm leading-5 text-gray-600">{t('manager.inventory.variants.groupsConfigured')}</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{t('manager.inventory.variants.requiredGroups')}</p>
              <p className="mt-3 text-2xl font-bold text-gray-950">
                {variantGroups.filter((group) => getGroupRequired(group)).length}
              </p>
              <p className="mt-2 text-sm leading-5 text-gray-600">{t('manager.inventory.variants.requiredHelp')}</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{t('manager.inventory.variants.optionalGroups')}</p>
              <p className="mt-3 text-2xl font-bold text-gray-950">
                {variantGroups.filter((group) => !getGroupRequired(group)).length}
              </p>
              <p className="mt-2 text-sm leading-5 text-gray-600">{t('manager.inventory.variants.optionalHelp')}</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Total Options</p>
              <p className="mt-3 text-2xl font-bold text-gray-950">{totalOptions}</p>
              <p className="mt-2 text-sm leading-5 text-gray-600">Choices across all groups</p>
            </div>
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
              <p className="mt-3 text-sm text-gray-500">
                Loading variant groups...
              </p>
            </div>
          </div>
        ) : (
          <div className="columns-1 gap-3 space-y-3 sm:columns-2 md:gap-4 md:space-y-4 lg:columns-3 xl:columns-4">
            <button
              type="button"
              onClick={handleAddVariantGroup}
              className="mb-3 flex min-h-45 w-full break-inside-avoid flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white p-4 transition hover:border-gray-900 hover:bg-gray-100 md:mb-4 md:min-h-50 md:gap-3 md:p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 md:h-12 md:w-12">
                <PlusIcon className="h-5 w-5 text-white md:h-6 md:w-6" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700 md:text-base">
                  {t('manager.inventory.variants.addNewVariantGroup')}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Create a new variant group
                </p>
              </div>
            </button>

            {filteredGroups.map((group) => {
              const options = getGroupOptions(group)
              const required = getGroupRequired(group)

              return (
                <div
                  key={group.id}
                  className="mb-3 flex break-inside-avoid flex-col overflow-hidden rounded-xl border border-gray-200 bg-white md:mb-4"
                >
                  <div className="border-b border-gray-200 p-3 md:p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-base font-bold text-gray-900 md:text-lg">
                        {group.name}
                      </h3>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditGroup(group)}
                          className="rounded-lg p-1.5 transition hover:bg-gray-100"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(group)}
                          className="rounded-lg p-1.5 transition text-danger-red hover:bg-red-50"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mb-2 flex items-center gap-2">
                      {required && (
                        <span
                          className="rounded-full border px-2 py-0.5 text-xs font-semibold bg-red-100 border-red-200 text-red-700"
                        >
                          {t('manager.inventory.variants.required')}
                        </span>
                      )}
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                        {group.type === 'single'
                          ? t('manager.inventory.variants.single')
                          : t('manager.inventory.variants.multiple')}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 md:text-sm">
                      {t('manager.inventory.variants.optionCount', { count: options.length })}
                    </p>
                  </div>

                  <div className="flex-1 space-y-2 p-3 md:p-4">
                    {options.map((option) => {
                      const priceModifier = getOptionPriceModifier(option)

                      return (
                        <div
                          key={option.id}
                          className="flex items-center justify-between rounded-lg bg-gray-50 p-2"
                        >
                          <span className="text-xs font-medium text-gray-700 md:text-sm">
                            {option.name}
                          </span>
                          {priceModifier !== 0 && (
                            <span
                              className={`text-xs font-semibold ${priceModifier > 0 ? 'text-green-700' : 'text-red-700'}`}
                            >
                              {formatPriceModifier(priceModifier)}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <VariantGroupModal
        isOpen={showAddGroupModal || editingGroup !== null}
        onClose={() => {
          setShowAddGroupModal(false)
          setEditingGroup(null)
        }}
        onSave={handleSaveNewGroup}
        onUpdate={handleUpdateGroup}
        editGroup={editingGroup}
      />

      <DeleteModal
        isOpen={deletingGroup !== null}
        onClose={() => setDeletingGroup(null)}
        onConfirm={confirmDeleteGroup}
        title={t('manager.inventory.variants.deleteTitle')}
        itemName={deletingGroup?.name || ''}
        description={t('manager.inventory.variants.deleteDescription')}
      />
    </div>
  )
}
