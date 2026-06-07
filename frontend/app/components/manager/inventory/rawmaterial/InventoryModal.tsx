'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArchiveBoxIcon,
  PencilSquareIcon,
  PlusIcon,
  TruckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { showError } from '@/lib/services/errorHandling'

interface InventoryItem {
  id: string
  name: string
  category: string
  stationScope: 'barista' | 'kitchen' | 'shared'
  trackingMode: InventoryTrackingMode
  parLevel: number
  currentStock: number
  reorderLevel: number
  unit: string
  supplier: string
  lastRestocked: string
  status: string
}

interface InventoryFormData {
  name: string
  category: string
  stationScope: 'barista' | 'kitchen' | 'shared'
  trackingMode: InventoryTrackingMode
  parLevel: number
  currentStock: number
  reorderLevel: number
  unit: string
  supplier: string
}

interface InventoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (item: Omit<InventoryItem, 'id' | 'lastRestocked' | 'status'>) => void
  onUpdate?: (item: InventoryItem) => void
  editItem?: InventoryItem | null
}

const categories = ['Ingredients', 'Packaging', 'Cleaning', 'Supplies']
const stationScopes = [
  { value: 'shared', label: 'Shared', description: 'Visible to barista and kitchen' },
  { value: 'barista', label: 'Barista', description: 'Beverage station material' },
  { value: 'kitchen', label: 'Kitchen', description: 'Food preparation material' },
] as const
type InventoryTrackingMode =
  | 'direct_auto_deduct'
  | 'kitchen_station_auto_deduct'
  | 'bulk_usage_expense'
const trackingModes = [
  {
    value: 'direct_auto_deduct',
    label: 'Direct Auto-Deduct',
    description: 'Bar/direct item. POS deducts from Inventory Master.',
  },
  {
    value: 'kitchen_station_auto_deduct',
    label: 'Kitchen Station',
    description: 'Protein or expensive kitchen item. Transfer to station before service.',
  },
  {
    value: 'bulk_usage_expense',
    label: 'Bulk Usage / Expense',
    description: 'Opened or moved to kitchen as bulk cost. Skipped by POS auto-deduct.',
  },
] as const
const units = ['kg', 'g', 'L', 'mL', 'pcs', 'box', 'pack']
const inputClass =
  'w-full rounded-lg border border-gray-900 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500'

const initialFormData: InventoryFormData = {
  name: '',
  category: 'Ingredients',
  stationScope: 'shared',
  trackingMode: 'direct_auto_deduct',
  parLevel: 0,
  currentStock: 0,
  reorderLevel: 0,
  unit: 'kg',
  supplier: '',
}

const getStockStatus = (
  currentStock: number,
  reorderLevel: number,
): 'in-stock' | 'low-stock' | 'out-of-stock' => {
  if (currentStock <= 0) return 'out-of-stock'
  if (currentStock <= reorderLevel) return 'low-stock'
  return 'in-stock'
}

const normalizeStatus = (status: string): 'in-stock' | 'low-stock' | 'out-of-stock' => {
  const value = status.toLowerCase().trim()
  if (value === 'critical' || value === 'out-of-stock' || value === 'out_of_stock') return 'out-of-stock'
  if (value === 'low' || value === 'low-stock' || value === 'low_stock') return 'low-stock'
  return 'in-stock'
}

const getStatusLabel = (status: string) => {
  const normalizedStatus = normalizeStatus(status)
  if (normalizedStatus === 'out-of-stock') return 'Out of stock'
  if (normalizedStatus === 'low-stock') return 'Low stock'
  return 'In stock'
}

const getStatusClassName = (status: string) => {
  const normalizedStatus = normalizeStatus(status)
  if (normalizedStatus === 'out-of-stock') return 'bg-red-50 text-red-700 border-red-200'
  if (normalizedStatus === 'low-stock') return 'bg-yellow-50 text-yellow-700 border-yellow-200'
  return 'bg-green-50 text-green-700 border-green-200'
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value)
}

const formatTrackingMode = (value: InventoryTrackingMode) => {
  return trackingModes.find((mode) => mode.value === value)?.label || 'Direct Auto-Deduct'
}

export default function InventoryModal({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  editItem,
}: InventoryModalProps) {
  const [formData, setFormData] = useState<InventoryFormData>(initialFormData)
  const [reorderLevelInput, setReorderLevelInput] = useState('')
  const [parLevelInput, setParLevelInput] = useState('')
  const [touchedSubmit, setTouchedSubmit] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const reorderRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTouchedSubmit(false)

    if (editItem) {
      setFormData({
        name: editItem.name,
        category: editItem.category,
        stationScope: editItem.stationScope ?? 'shared',
        trackingMode: editItem.trackingMode ?? 'direct_auto_deduct',
        parLevel: editItem.parLevel ?? 0,
        currentStock: editItem.currentStock,
        reorderLevel: editItem.reorderLevel,
        unit: editItem.unit,
        supplier: editItem.supplier,
      })
      setReorderLevelInput(String(editItem.reorderLevel || ''))
      setParLevelInput(String(editItem.parLevel || ''))
      return
    }

    setFormData(initialFormData)
    setReorderLevelInput('')
    setParLevelInput('')
  }, [editItem, isOpen])

  const parsedReorderLevel = Number(reorderLevelInput)
  const reorderLevelNumber = Number.isFinite(parsedReorderLevel) ? parsedReorderLevel : 0

  const previewStatus = useMemo(
    () => getStockStatus(formData.currentStock, reorderLevelNumber),
    [formData.currentStock, reorderLevelNumber],
  )

  const updateField = <K extends keyof InventoryFormData>(
    field: K,
    value: InventoryFormData[K],
  ) => {
    setFormData((previous) => {
      if (field === 'trackingMode' && (value === 'kitchen_station_auto_deduct' || value === 'bulk_usage_expense')) {
        return { ...previous, [field]: value, stationScope: 'kitchen' }
      }

      return { ...previous, [field]: value }
    })
  }

  const handleClose = () => {
    setTouchedSubmit(false)
    onClose()
  }

  const invalidClass = (invalid: boolean) => touchedSubmit && invalid ? 'border-red-400 bg-red-50' : ''

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTouchedSubmit(true)

    const name = formData.name.trim()
    const reorderLevel = Number(reorderLevelInput)

    if (!name) {
      nameRef.current?.focus()
      showError('Item name is required.')
      return
    }

    if (!Number.isFinite(reorderLevel) || reorderLevel <= 0) {
      reorderRef.current?.focus()
      showError('Reorder level is required and must be greater than 0.')
      return
    }

    const normalizedData: InventoryFormData = {
      ...formData,
      name,
      reorderLevel,
      parLevel: Number.isFinite(Number(parLevelInput)) ? Number(parLevelInput) : 0,
      currentStock: editItem ? editItem.currentStock : 0,
      supplier: editItem ? editItem.supplier : '',
    }

    if (editItem && onUpdate) {
      onUpdate({
        ...editItem,
        ...normalizedData,
        currentStock: editItem.currentStock,
        status: getStockStatus(editItem.currentStock, normalizedData.reorderLevel),
        lastRestocked: editItem.lastRestocked || new Date().toISOString(),
      })
    } else {
      onSave(normalizedData)
    }

    handleClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
              {editItem ? (
                <PencilSquareIcon className="h-5 w-5 text-gray-700" />
              ) : (
                <PlusIcon className="h-5 w-5 text-gray-700" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {editItem ? 'Edit inventory item' : 'Add inventory item'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {editItem
                  ? 'Update item details and reorder level. Supplier changes are recorded through Restock.'
                  : 'Create the item master first. Add stock, supplier, cost, batch, and receipt through Restock.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close inventory modal"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_0.9fr]">
              <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Item name <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={nameRef}
                    type="text"
                    value={formData.name}
                    onChange={(event) => updateField('name', event.target.value)}
                    className={`${inputClass} ${invalidClass(!formData.name.trim())}`}
                    placeholder="Example: Coffee Beans"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(event) => updateField('category', event.target.value)}
                      className={inputClass}
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Unit
                    </label>
                    <select
                      value={formData.unit}
                      onChange={(event) => updateField('unit', event.target.value)}
                      className={inputClass}
                    >
                      {units.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  {editItem ? (
                    <div className="mb-4">
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Current stock
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.currentStock}
                        disabled
                        className={inputClass}
                        placeholder="0"
                      />
                      <p className="mt-1 text-xs text-gray-400">
                        Stock changes are handled by Restock or Adjust Stock so the audit trail stays clean.
                      </p>
                    </div>
                  ) : null}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Reorder level <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={reorderRef}
                      type="number"
                      min="0"
                      step="0.01"
                      value={reorderLevelInput}
                      onChange={(event) => setReorderLevelInput(event.target.value)}
                      className={`${inputClass} ${invalidClass(!Number.isFinite(Number(reorderLevelInput)) || Number(reorderLevelInput) <= 0)}`}
                      placeholder="Minimum stock before reorder"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Stock quantity is recorded through Restock for purchases or Adjust Stock for corrections.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Station scope
                  </label>
                  {(formData.trackingMode === 'kitchen_station_auto_deduct' || formData.trackingMode === 'bulk_usage_expense') && (
                    <p className="mb-2 text-xs font-medium text-gray-500">
                      Kitchen Station and Bulk Usage items are always assigned to Kitchen.
                    </p>
                  )}
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    {stationScopes.map((scope) => {
                      const selected = formData.stationScope === scope.value
                      const lockedToKitchen =
                        formData.trackingMode === 'kitchen_station_auto_deduct' ||
                        formData.trackingMode === 'bulk_usage_expense'
                      const disabled = lockedToKitchen && scope.value !== 'kitchen'

                      return (
                        <button
                          key={scope.value}
                          type="button"
                          onClick={() => {
                            if (!disabled) updateField('stationScope', scope.value)
                          }}
                          disabled={disabled}
                          className={`rounded-lg border px-3 py-2 text-left transition ${
                            selected
                              ? 'border-gray-900 bg-gray-900 text-white'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                          } ${disabled ? 'cursor-not-allowed opacity-40 hover:border-gray-200' : ''}`}
                        >
                          <span className="block text-sm font-semibold">{scope.label}</span>
                          <span className={`mt-0.5 block text-xs ${selected ? 'text-gray-200' : 'text-gray-500'}`}>
                            {scope.description}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Par level
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={parLevelInput}
                    onChange={(event) => setParLevelInput(event.target.value)}
                    className={inputClass}
                    placeholder="Daily station target, optional"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Used for kitchen station top-up planning. Leave blank when this item does not need daily par control.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Tracking mode
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {trackingModes.map((mode) => {
                      const selected = formData.trackingMode === mode.value

                      return (
                        <button
                          key={mode.value}
                          type="button"
                          onClick={() => updateField('trackingMode', mode.value)}
                          className={`rounded-lg border px-3 py-2 text-left transition ${
                            selected
                              ? 'border-gray-900 bg-gray-900 text-white'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          <span className="block text-sm font-semibold">{mode.label}</span>
                          <span className={`mt-0.5 block text-xs ${selected ? 'text-gray-200' : 'text-gray-500'}`}>
                            {mode.description}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

              </div>

              <aside className="space-y-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <ArchiveBoxIcon className="h-5 w-5 text-gray-700" />
                    <h3 className="text-sm font-semibold text-gray-900">Item preview</h3>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {formData.name.trim() || 'Unnamed item'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {formData.category} • {formData.stationScope} • {formData.unit}
                        </p>
                        <p className="mt-1 text-xs font-medium text-gray-700">
                          {formatTrackingMode(formData.trackingMode)}
                        </p>
                      </div>
                      <span
                        className={`rounded-lg border px-2 py-1 text-xs font-medium ${getStatusClassName(
                          previewStatus,
                        )}`}
                      >
                        {getStatusLabel(previewStatus)}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">{editItem ? 'Current stock' : 'Starting stock'}</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {formatNumber(editItem ? formData.currentStock : 0)} {formData.unit}
                        </p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Reorder at</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {formatNumber(reorderLevelNumber)} {formData.unit}
                        </p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Par level</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {formatNumber(Number(parLevelInput) || 0)} {formData.unit}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <TruckIcon className="h-5 w-5 text-gray-700" />
                    <h3 className="text-sm font-semibold text-gray-900">Supplier info</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    {editItem
                      ? formData.supplier.trim() || 'Supplier has not been set.'
                      : 'Supplier will be recorded on first Restock.'}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-gray-400">
                    Restock records the active supplier, purchase total, batch number, expiry date, and receipt photo for audit.
                  </p>
                </div>
              </aside>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 bg-white px-5 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              {editItem ? 'Update item' : 'Add item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
