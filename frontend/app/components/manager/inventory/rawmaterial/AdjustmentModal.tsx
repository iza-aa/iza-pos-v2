'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { showError } from '@/lib/services/errorHandling'

interface InventoryItem {
  id: string
  name: string
  unit: string
  currentStock: number
}

type AdjustmentBatchOption = {
  id: string
  batchNumber: string
  supplier: string
  quantityRemaining: number
  unit: string
  expiryDate: string
}

interface AdjustmentModalProps {
  isOpen: boolean
  onClose: () => void
  item: InventoryItem | null
  activeBatches?: AdjustmentBatchOption[]
  onAdjust: (itemId: string, newStock: number, reason: string, batchId?: string) => Promise<void>
}

const adjustmentReasons = [
  'Damaged / Spoiled',
  'Expired',
  'Lost / Stolen',
  'Stock Count Correction',
  'Quality Issue',
  'Other',
]

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value)
}

export default function AdjustmentModal({ isOpen, onClose, item, activeBatches = [], onAdjust }: AdjustmentModalProps) {
  const [newStock, setNewStock] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [batchId, setBatchId] = useState('')
  const [loading, setLoading] = useState(false)
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const newStockRef = useRef<HTMLInputElement>(null)
  const reasonRef = useRef<HTMLSelectElement>(null)
  const batchRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    if (!isOpen) {
      setNewStock('')
      setReason('')
      setNotes('')
      setBatchId('')
      setLoading(false)
      setAttemptedSubmit(false)
    }
  }, [isOpen])

  const parsedNewStock = useMemo(() => {
    if (newStock.trim() === '') return null
    const value = Number(newStock)
    return Number.isFinite(value) ? value : null
  }, [newStock])

  const selectedBatch = activeBatches.find((batch) => batch.id === batchId)
  const currentAdjustmentStock = selectedBatch?.quantityRemaining ?? item?.currentStock ?? 0
  const stockDiff = parsedNewStock !== null ? parsedNewStock - currentAdjustmentStock : 0
  const resultingTotalStock =
    item && parsedNewStock !== null
      ? selectedBatch
        ? item.currentStock + stockDiff
        : parsedNewStock
      : null
  const hasChange = parsedNewStock !== null && item !== null && stockDiff !== 0
  const isReduction = stockDiff < 0

  if (!isOpen || !item) return null

  const handleClose = () => {
    if (loading) return
    onClose()
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAttemptedSubmit(true)

    if (parsedNewStock === null || !reason) {
      if (parsedNewStock === null) newStockRef.current?.focus()
      else reasonRef.current?.focus()
      showError('Please complete all required fields.')
      return
    }

    if (parsedNewStock < 0) {
      newStockRef.current?.focus()
      showError('Stock cannot be negative.')
      return
    }

    if (resultingTotalStock !== null && resultingTotalStock < 0) {
      newStockRef.current?.focus()
      showError('Total stock cannot become negative.')
      return
    }

    if (stockDiff === 0) {
      newStockRef.current?.focus()
      showError('New stock must be different from current stock.')
      return
    }

    if (activeBatches.length > 0 && !batchId) {
      batchRef.current?.focus()
      showError('Select the active batch or supplier affected by this adjustment.')
      return
    }

    if (isReduction && selectedBatch && Math.abs(stockDiff) > selectedBatch.quantityRemaining) {
      batchRef.current?.focus()
      showError('Adjustment reduction cannot exceed the selected batch remaining stock.')
      return
    }

    setLoading(true)
    try {
      const batchNote = selectedBatch
        ? `Batch ${selectedBatch.batchNumber}, Supplier ${selectedBatch.supplier}`
        : ''
      const fullReason = [reason, batchNote, notes.trim()].filter(Boolean).join(' - ')
      await onAdjust(item.id, resultingTotalStock ?? parsedNewStock, fullReason, batchId || undefined)

      setNewStock('')
      setReason('')
      setNotes('')
      setBatchId('')
      setAttemptedSubmit(false)
      onClose()
    } catch {
      showError('Failed to adjust stock.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-gray-100 p-2.5">
              <AdjustmentsHorizontalIcon className="h-6 w-6 text-gray-900" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Stock Adjustment</h2>
              <p className="mt-1 text-sm text-gray-500">
                Correct stock count for damaged, lost, expired, or miscounted items.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close adjustment modal"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="min-h-0 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_0.85fr]">
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-500">Selected item</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">{item.name}</p>
                  </div>
                  <div className="rounded-lg bg-white px-3 py-2 text-right text-sm border border-gray-200">
                    <p className="text-gray-500">Current stock</p>
                    <p className="font-bold text-gray-900">
                      {formatNumber(item.currentStock)} {item.unit}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex gap-3">
                  <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Use adjustment only for corrections</p>
                    <p className="mt-1 text-sm text-amber-800">
                      Use Restock for purchases or supplier deliveries. Adjustment is intended for damaged items,
                      counting corrections, expired stock, or lost stock.
                    </p>
                  </div>
                </div>
              </div>

              {activeBatches.length > 0 ? (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Affected Batch / Supplier <span className="text-red-500">*</span>
                  </label>
                  <select
                    ref={batchRef}
                    value={batchId}
                    onChange={(event) => setBatchId(event.target.value)}
                    className={`w-full rounded-lg border bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-100 ${
                      attemptedSubmit && !batchId ? 'border-red-400 bg-red-50' : 'border-gray-900'
                    }`}
                  >
                    <option value="">Select active batch</option>
                    {activeBatches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.batchNumber} - {batch.supplier} - {formatNumber(batch.quantityRemaining)} {batch.unit}
                        {batch.expiryDate ? ` - Exp ${batch.expiryDate}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-gray-500">
                    Select the batch that physically lost, gained, expired, or was counted incorrectly.
                  </p>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    {selectedBatch ? 'Corrected Batch Stock' : 'New Stock Amount'} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={newStockRef}
                      type="number"
                      value={newStock}
                      onChange={(event) => setNewStock(event.target.value)}
                      placeholder="Enter corrected stock"
                      className={`w-full rounded-lg border bg-white px-4 py-3 pr-16 text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-100 ${
                        attemptedSubmit && (parsedNewStock === null || parsedNewStock < 0 || stockDiff === 0) ? 'border-red-400 bg-red-50' : 'border-gray-900'
                      }`}
                      min="0"
                      step="0.01"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                      {item.unit}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <select
                    ref={reasonRef}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className={`w-full rounded-lg border bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-100 ${
                      attemptedSubmit && !reason ? 'border-red-400 bg-red-50' : 'border-gray-900'
                    }`}
                  >
                    <option value="">Select reason</option>
                    {adjustmentReasons.map((adjustmentReason) => (
                      <option key={adjustmentReason} value={adjustmentReason}>
                        {adjustmentReason}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Additional Notes</label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add incident details, batch number, or count notes..."
                  className="min-h-30 w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
                  rows={4}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <ArrowPathIcon className="h-5 w-5 text-gray-700" />
                  <h3 className="font-bold text-gray-900">Adjustment Preview</h3>
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <span className="text-gray-500">{selectedBatch ? 'Current Batch' : 'Current'}</span>
                    <span className="font-semibold text-gray-900">
                      {formatNumber(currentAdjustmentStock)} {item.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <span className="text-gray-500">Change</span>
                    <span
                      className={`font-semibold ${
                        hasChange
                          ? isReduction
                            ? 'text-red-600'
                            : 'text-emerald-700'
                          : 'text-gray-900'
                      }`}
                    >
                      {hasChange ? `${stockDiff > 0 ? '+' : ''}${formatNumber(stockDiff)} ${item.unit}` : '-'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                    <span className="text-gray-500">Batch</span>
                    <span className="text-right font-semibold text-gray-900">
                      {selectedBatch
                        ? `${selectedBatch.batchNumber} / ${selectedBatch.supplier}`
                        : activeBatches.length > 0
                          ? 'Select batch'
                          : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-gray-900 px-3 py-3 text-white">
                    <span className="text-gray-300">{selectedBatch ? 'New Batch Stock' : 'New Stock'}</span>
                    <span className="font-bold">
                      {parsedNewStock !== null ? `${formatNumber(parsedNewStock)} ${item.unit}` : '-'}
                    </span>
                  </div>
                  {selectedBatch ? (
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                      <span className="text-gray-500">New Total Stock</span>
                      <span className="font-bold text-gray-900">
                        {resultingTotalStock !== null ? `${formatNumber(resultingTotalStock)} ${item.unit}` : '-'}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h4 className="text-sm font-bold text-gray-900">Adjustment Impact</h4>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  This action will record a stock correction and update the inventory count immediately.
                  The reason and notes will be visible in Stock Usage History.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-gray-900 px-5 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Confirm Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
