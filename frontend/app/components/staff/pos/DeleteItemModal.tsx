'use client'

import { useState } from 'react'
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { formatCurrency } from '@/lib/numberConstants'

interface DeleteItemModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (quantityToDelete: number) => void
  itemName: string
  currentQuantity: number
  price: number
}

export default function DeleteItemModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemName, 
  currentQuantity,
  price 
}: DeleteItemModalProps) {
  const [quantityToDelete, setQuantityToDelete] = useState(1)

  const handleConfirm = () => {
    onConfirm(quantityToDelete)
    onClose()
  }

  const handleIncrement = () => {
    if (quantityToDelete < currentQuantity) {
      setQuantityToDelete(quantityToDelete + 1)
    }
  }

  const handleDecrement = () => {
    if (quantityToDelete > 1) {
      setQuantityToDelete(quantityToDelete - 1)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Remove Item</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <XMarkIcon className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            How many <span className="font-semibold text-gray-800">{itemName}</span> do you want to remove?
          </p>

          {/* Quantity Selector */}
          <div className="flex items-center justify-center gap-4 bg-gray-50 rounded-xl p-6">
            <button
              onClick={handleDecrement}
              disabled={quantityToDelete <= 1}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
                quantityToDelete <= 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white border-2 border-gray-300 hover:border-gray-900 text-gray-700'
              }`}
            >
              <ChevronLeftIcon className="w-6 h-6" />
            </button>

            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">{quantityToDelete}</div>
              <div className="text-sm text-gray-500 mt-1">of {currentQuantity}</div>
            </div>

            <button
              onClick={handleIncrement}
              disabled={quantityToDelete >= currentQuantity}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
                quantityToDelete >= currentQuantity
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white border-2 border-gray-300 hover:border-gray-900 text-gray-700'
              }`}
            >
              <ChevronRightIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Price Info */}
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-300">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Amount to deduct:</span>
              <span className="text-lg font-bold" style={{ color: '#FF6859' }}>
                {formatCurrency(price * quantityToDelete)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-3 text-white rounded-xl hover:opacity-90 transition font-medium"
            style={{ backgroundColor: '#FF6859' }}
          >
            Remove {quantityToDelete === currentQuantity ? 'All' : quantityToDelete}
          </button>
        </div>
      </div>
    </div>
  )
}
