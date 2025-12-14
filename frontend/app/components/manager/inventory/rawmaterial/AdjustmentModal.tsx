'use client'

import { useState } from 'react'
import { XMarkIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline'
import { showSuccess, showError } from '@/lib/services/errorHandling'
import { validateRequired, validateRange } from '@/lib/utils'

interface InventoryItem {
  id: string
  name: string
  unit: string
  currentStock: number
}

interface AdjustmentModalProps {
  isOpen: boolean
  onClose: () => void
  item: InventoryItem | null
  onAdjust: (itemId: string, newStock: number, reason: string) => Promise<void>
}

const adjustmentReasons = [
  'Damaged/Spoiled',
  'Expired',
  'Lost/Stolen',
  'Stock Count Correction',
  'Quality Issue',
  'Other (specify in notes)'
]

export default function AdjustmentModal({ isOpen, onClose, item, onAdjust }: AdjustmentModalProps) {
  const [newStock, setNewStock] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen || !item) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newStock === '' || !reason) {
      showError('Lengkapi semua field yang diperlukan')
      return
    }

    const newStockNum = Number(newStock)
    if (newStockNum < 0) {
      showError('Stok tidak boleh negatif')
      return
    }

    setLoading(true)
    try {
      const fullReason = notes ? `${reason} - ${notes}` : reason
      await onAdjust(item.id, newStockNum, fullReason)
      
      // Reset form
      setNewStock('')
      setReason('')
      setNotes('')
      onClose()
    } catch (error) {
      showError('Gagal melakukan adjustment stok')
    } finally {
      setLoading(false)
    }
  }

  const stockDiff = newStock ? Number(newStock) - item.currentStock : 0
  const isReduction = stockDiff < 0

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <AdjustmentsHorizontalIcon className="w-6 h-6 text-gray-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Stock Adjustment</h2>
              <p className="text-sm text-gray-500 mt-1">{item.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <XMarkIcon className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Current Stock Info */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Current Stock:</span>
                <span className="font-semibold text-gray-900">{item.currentStock} {item.unit}</span>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
              <p className="text-xs text-gray-700">
                <strong>Note:</strong> Stock Adjustment is for corrections only (damaged, lost, count errors). 
                Use Restock for purchases.
              </p>
            </div>

            {/* New Stock Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Stock Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  placeholder="Enter new stock amount"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  min="0"
                  step="0.01"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  {item.unit}
                </span>
              </div>
              {newStock && (
                <p className="text-xs mt-1 font-medium text-gray-700">
                  {isReduction ? '-' : '+'}{Math.abs(stockDiff)} {item.unit} 
                  ({isReduction ? 'reduction' : 'increase'})
                </p>
              )}
            </div>

            {/* Reason Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                required
              >
                <option value="">Select reason...</option>
                {adjustmentReasons.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Batch number, incident details, who reported..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            {/* Summary */}
            {newStock && stockDiff !== 0 && (
              <div className="p-4 rounded-xl border bg-gray-50 border-gray-200">
                <h4 className="text-sm font-semibold mb-3 text-gray-900">
                  Adjustment Summary
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Current:
                    </span>
                    <span className="font-semibold text-gray-900">
                      {item.currentStock} {item.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Change:
                    </span>
                    <span className="font-bold text-gray-900">
                      {stockDiff > 0 ? '+' : ''}{stockDiff} {item.unit}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-300">
                    <span className="text-gray-600">
                      New Stock:
                    </span>
                    <span className="font-bold text-gray-900">
                      {newStock} {item.unit}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !newStock || !reason || stockDiff === 0}
            >
              {loading ? 'Processing...' : 'Confirm Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
