'use client'

import { useState } from 'react'
import { XMarkIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import { formatCurrency } from '@/lib/numberConstants'
import { showSuccess, showError } from '@/lib/errorHandling'
import { validateRequired, isPositiveInteger } from '@/lib/validation'

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

export default function RestockModal({ isOpen, onClose, item, onRestock }: RestockModalProps) {
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [costPerUnit, setCostPerUnit] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen || !item) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!quantity || Number(quantity) <= 0) {
      showError('Masukkan jumlah yang valid (angka positif)')
      return
    }

    setLoading(true)
    try {
      const cost = costPerUnit ? Number(costPerUnit) : undefined
      await onRestock(item.id, Number(quantity), notes, cost)
      
      // Reset form
      setQuantity('')
      setNotes('')
      setCostPerUnit('')
      onClose()
    } catch (error) {
      showError('Gagal melakukan restock item')
    } finally {
      setLoading(false)
    }
  }

  const totalCost = costPerUnit && quantity ? (Number(costPerUnit) * Number(quantity)).toFixed(2) : '0.00'
  const formattedTotalCost = formatCurrency(Number(totalCost), { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const newStock = item.currentStock + (Number(quantity) || 0)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <ArrowUpTrayIcon className="w-6 h-6 text-gray-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Restock Item</h2>
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
              <div className="flex justify-between items-center text-sm mt-2">
                <span className="text-gray-600">Supplier:</span>
                <span className="font-medium text-gray-700">{item.supplier}</span>
              </div>
            </div>

            {/* Quantity Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Restock Quantity <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  min="0"
                  step="0.01"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  {item.unit}
                </span>
              </div>
            </div>

            {/* Cost Per Unit (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cost Per Unit (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                <input
                  type="number"
                  value={costPerUnit}
                  onChange={(e) => setCostPerUnit(e.target.value)}
                  placeholder="0"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., PO #12345, Batch: A123, Expiry: 2026-01"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            {/* Summary */}
            {quantity && Number(quantity) > 0 && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Restock Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">New Stock:</span>
                    <span className="font-bold text-gray-900">{newStock} {item.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Adding:</span>
                    <span className="font-semibold text-gray-900">+{quantity} {item.unit}</span>
                  </div>
                  {costPerUnit && (
                    <div className="flex justify-between pt-2 border-t border-gray-300">
                      <span className="text-gray-600">Total Cost:</span>
                      <span className="font-bold text-gray-900">Rp {formattedTotalCost}</span>
                    </div>
                  )}
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
              disabled={loading || !quantity || Number(quantity) <= 0}
            >
              {loading ? 'Processing...' : 'Confirm Restock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
