'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, TagIcon } from '@heroicons/react/24/outline'
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
  IceCream,
} from 'lucide-react'
import { useLanguage } from '@/app/components/shared/i18n'

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, iconName: string) => Promise<void>
  category?: { id: string; name: string; icon: string; type?: string } | null
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
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [iconName, setIconName] = useState('Coffee')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (category) {
        setName(category.name)
        setIconName(category.icon)
      } else {
        setName('')
        setIconName('Coffee')
      }
      setSaving(false)
    }
  }, [isOpen, category])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await onSave(name.trim(), iconName)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  // Find selected icon component for preview
  const SelectedIcon = categoryIcons.find((i) => i.name === iconName)?.icon ?? Coffee

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {category
                ? t('manager.menu.categoryModal.editTitle')
                : t('manager.menu.categoryModal.addTitle')}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {category
                ? t('manager.menu.categoryModal.editSubtitle')
                : t('manager.menu.categoryModal.addSubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-5">

              {/* Category Details Card */}
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-4 flex items-center gap-2">
                  <div className="rounded-lg bg-gray-100 p-2">
                    <TagIcon className="h-5 w-5 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {t('manager.menu.categoryModal.detailsTitle')}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {t('manager.menu.categoryModal.detailsSubtitle')}
                    </p>
                  </div>
                </div>

                {/* Category Name */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    {t('manager.menu.categoryModal.name')}
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={saving}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-900 focus:outline-none disabled:opacity-50"
                    placeholder={t('manager.menu.categoryModal.namePlaceholder')}
                  />
                </div>
              </div>

              {/* Icon Selection Card */}
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {t('manager.menu.categoryModal.icon')}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {t('manager.menu.categoryModal.iconSubtitle')}
                    </p>
                  </div>
                  {/* Selected icon preview */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-gray-900 bg-gray-900">
                    <SelectedIcon className="h-5 w-5 text-white" strokeWidth={1.5} />
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {categoryIcons.map((item) => {
                    const IconComponent = item.icon
                    const isSelected = iconName === item.name
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setIconName(item.name)}
                        disabled={saving}
                        title={item.name}
                        className={`aspect-square rounded-lg border-2 p-3 transition flex items-center justify-center ${
                          isSelected
                            ? 'border-gray-900 bg-gray-900'
                            : 'border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        <IconComponent
                          className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-gray-600'}`}
                          strokeWidth={1.5}
                        />
                      </button>
                    )
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? t('common.saving')
                : category
                  ? t('manager.menu.categoryModal.update')
                  : t('manager.menu.categoryModal.add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
