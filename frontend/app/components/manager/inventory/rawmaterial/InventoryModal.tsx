'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  PlusIcon,
  TruckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface InventoryItem {
  id: string
  name: string
  category: string
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
const units = ['kg', 'g', 'L', 'mL', 'pcs', 'box', 'pack']

const initialFormData: InventoryFormData = {
  name: '',
  category: 'Ingredients',
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

export default function InventoryModal({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  editItem,
}: InventoryModalProps) {
  const [formData, setFormData] = useState<InventoryFormData>(initialFormData)
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')

    if (editItem) {
      setFormData({
        name: editItem.name,
        category: editItem.category,
        currentStock: editItem.currentStock,
        reorderLevel: editItem.reorderLevel,
        unit: editItem.unit,
        supplier: editItem.supplier,
      })
      return
    }

    setFormData(initialFormData)
  }, [editItem, isOpen])

  const previewStatus = useMemo(
    () => getStockStatus(formData.currentStock, formData.reorderLevel),
    [formData.currentStock, formData.reorderLevel],
  )

  const updateField = <K extends keyof InventoryFormData>(
    field: K,
    value: InventoryFormData[K],
  ) => {
    setFormData((previous) => ({ ...previous, [field]: value }))
  }

  const handleClose = () => {
    setError('')
    onClose()
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const name = formData.name.trim()
    const supplier = formData.supplier.trim()

    if (!name) {
      setError('Item name is required.')
      return
    }

    if (!supplier) {
      setError('Supplier name is required.')
      return
    }

    if (formData.currentStock < 0 || formData.reorderLevel < 0) {
      setError('Stock and reorder level cannot be negative.')
      return
    }

    const normalizedData: InventoryFormData = {
      ...formData,
      name,
      supplier,
    }

    if (editItem && onUpdate) {
      onUpdate({
        ...editItem,
        ...normalizedData,
        status: getStockStatus(normalizedData.currentStock, normalizedData.reorderLevel),
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
                  ? 'Update item details, reorder level, and supplier information.'
                  : 'Create a new raw material, packaging, or supply item.'}
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

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {error ? (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_0.9fr]">
              <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Item name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(event) => updateField('name', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                    placeholder="Example: Coffee Beans"
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
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
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
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                    >
                      {units.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      {editItem ? 'Current stock' : 'Initial stock'}
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.currentStock}
                      onChange={(event) => updateField('currentStock', Number(event.target.value))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      placeholder="0"
                    />
                    {editItem ? (
                      <p className="mt-1 text-xs text-gray-400">
                        Use restock/usage history for audit-sensitive stock changes.
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Reorder level
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.reorderLevel}
                      onChange={(event) => updateField('reorderLevel', Number(event.target.value))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      placeholder="Minimum stock before reorder"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Supplier
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.supplier}
                    onChange={(event) => updateField('supplier', event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                    placeholder="Example: PT Kopi Nusantara"
                  />
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
                          {formData.category} • {formData.unit}
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
                        <p className="text-xs text-gray-500">Current stock</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {formatNumber(formData.currentStock)} {formData.unit}
                        </p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Reorder at</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {formatNumber(formData.reorderLevel)} {formData.unit}
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
                    {formData.supplier.trim() || 'Supplier has not been set.'}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-gray-400">
                    Supplier information helps managers track restock sources and purchase follow-ups.
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