'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowPathRoundedSquareIcon,
  ArrowUpTrayIcon,
  BuildingStorefrontIcon,
  CurrencyDollarIcon,
  CubeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { formatCurrency } from '@/lib/constants'
import { showError } from '@/lib/services/errorHandling'

interface InventoryItem {
  id: string
  name: string
  unit: string
  currentStock: number
  supplier: string
}

interface RestockModalProps {
  isOpen: boolean
  onClose: () => void
  item: InventoryItem | null
  onRestock: (itemId: string, quantity: number, notes: string, cost?: number) => Promise<void>
}

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500'

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Failed to restock item.'
}

const parseNumber = (value: string) => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

export default function RestockModal({ isOpen, onClose, item, onRestock }: RestockModalProps) {
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [costPerUnit, setCostPerUnit] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setQuantity('')
      setNotes('')
      setCostPerUnit('')
      setLoading(false)
    }
  }, [isOpen])

  const quantityNumber = useMemo(() => parseNumber(quantity), [quantity])
  const costNumber = useMemo(() => parseNumber(costPerUnit), [costPerUnit])
  const newStock = item ? item.currentStock + quantityNumber : 0
  const totalCost = quantityNumber > 0 && costNumber > 0 ? quantityNumber * costNumber : 0
  const isValid = Boolean(item) && quantityNumber > 0 && costNumber >= 0

  if (!isOpen || !item) return null

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (quantityNumber <= 0) {
      showError('Enter a valid restock quantity greater than 0.')
      return
    }

    if (costPerUnit && costNumber < 0) {
      showError('Cost per unit cannot be negative.')
      return
    }

    setLoading(true)

    try {
      await onRestock(item.id, quantityNumber, notes.trim(), costPerUnit ? costNumber : undefined)
      setQuantity('')
      setNotes('')
      setCostPerUnit('')
      onClose()
    } catch (error) {
      showError(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100">
              <ArrowUpTrayIcon className="h-5 w-5 text-gray-900" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Restock Item</h2>
              <p className="mt-1 text-sm text-gray-500">Add new stock for {item.name}.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close restock modal"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 overflow-y-auto p-6">
          <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-gray-200">
                    <CubeIcon className="h-5 w-5 text-gray-900" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">Current stock: {item.currentStock} {item.unit}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">
                    Restock Quantity <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      placeholder="0"
                      className={`${inputClass} pr-16`}
                      min="0"
                      step="0.01"
                      disabled={loading}
                      required
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                      {item.unit}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-400">Quantity that will be added to current stock.</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">
                    Cost Per Unit
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">
                      Rp
                    </span>
                    <input
                      type="number"
                      value={costPerUnit}
                      onChange={(event) => setCostPerUnit(event.target.value)}
                      placeholder="0"
                      className={`${inputClass} pl-11`}
                      min="0"
                      step="0.01"
                      disabled={loading}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-400">Optional purchase cost for this restock.</p>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800">Notes</label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Example: PO #12345, Batch A123, Expiry 2026-01"
                  className={`${inputClass} min-h-28 resize-none`}
                  rows={4}
                  disabled={loading}
                />
              </div>
                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <CurrencyDollarIcon className="h-4 w-4 text-gray-700" />
                  <p className="text-sm font-semibold text-gray-900">Cost Summary</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500">Cost / Unit</span>
                    <span className="font-semibold text-gray-900">
                      {costNumber > 0 ? formatCurrency(costNumber) : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-2">
                    <span className="text-gray-500">Total Cost</span>
                    <span className="font-bold text-gray-900">
                      {totalCost > 0 ? formatCurrency(totalCost) : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                    <ArrowPathRoundedSquareIcon className="h-5 w-5 text-gray-900" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Stock Preview</h3>
                    <p className="text-xs text-gray-500">Review stock change before saving.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Current Stock</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">
                      {item.currentStock} <span className="text-sm font-medium text-gray-500">{item.unit}</span>
                    </p>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Added Quantity</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">
                      +{quantityNumber || 0} <span className="text-sm font-medium text-gray-500">{item.unit}</span>
                    </p>
                  </div>

                  <div className="rounded-lg border border-gray-900 bg-gray-900 p-3 text-white">
                    <p className="text-xs text-gray-300">New Stock</p>
                    <p className="mt-1 text-lg font-bold">
                      {newStock} <span className="text-sm font-medium text-gray-300">{item.unit}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <BuildingStorefrontIcon className="h-4 w-4 text-gray-700" />
                  <p className="text-sm font-semibold text-gray-900">Supplier</p>
                </div>
                <p className="text-sm text-gray-600">{item.supplier || 'No supplier set'}</p>
              </div>


            </aside>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isValid}
              className="rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Confirm Restock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}