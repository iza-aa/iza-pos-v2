'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: {
    paymentMethod: string
    customerName?: string
    customerPhone?: string
    tableNumber?: string
    notes?: string
  }) => void
  totalAmount: number
}

export default function PaymentModal({ isOpen, onClose, onConfirm, totalAmount }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway'>('dine-in')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [tableNumber, setTableNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [cashReceived, setCashReceived] = useState('')
  
  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPaymentMethod('cash')
      setOrderType('dine-in')
      setCustomerName('')
      setCustomerPhone('')
      setTableNumber('')
      setNotes('')
      setCashReceived('')
    }
  }, [isOpen])

  const calculateChange = () => {
    const received = parseFloat(cashReceived) || 0
    return Math.max(0, received - totalAmount)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate cash payment
    if (paymentMethod === 'cash') {
      const received = parseFloat(cashReceived) || 0
      if (received < totalAmount) {
        alert('Cash received must be greater than or equal to total amount')
        return
      }
    }

    onConfirm({
      paymentMethod,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      tableNumber: orderType === 'dine-in' ? tableNumber : undefined,
      notes: notes || undefined,
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Complete Order</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <XMarkIcon className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Order Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Order Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOrderType('dine-in')}
                className={`px-4 py-3 rounded-xl font-medium transition ${
                  orderType === 'dine-in'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🍽️ Dine In
              </button>
              <button
                type="button"
                onClick={() => setOrderType('takeaway')}
                className={`px-4 py-3 rounded-xl font-medium transition ${
                  orderType === 'takeaway'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🥡 Takeaway
              </button>
            </div>
          </div>

          {/* Table Number (only for dine-in) */}
          {orderType === 'dine-in' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Table Number
              </label>
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Table 5"
              />
            </div>
          )}

          {/* Customer Name (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer Name (Optional)
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter customer name"
            />
          </div>

          {/* Customer Phone (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="08123456789"
            />
          </div>

          {/* Payment Method - Cash Only for now */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <div className="px-4 py-3 bg-green-500 text-white rounded-xl font-medium text-center">
              💵 Cash Payment
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">Other payment methods coming soon</p>
          </div>

          {/* Cash Amount (only for cash payment) */}
          {paymentMethod === 'cash' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cash Received
              </label>
              <input
                type="number"
                required
                min={totalAmount}
                step="1000"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Minimum Rp ${totalAmount.toLocaleString('id-ID')}`}
              />
              {cashReceived && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Change:</span>
                    <span className="font-bold text-blue-600">
                      Rp {calculateChange().toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Special requests, allergies, etc."
            />
          </div>

          {/* Total Summary */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-medium text-gray-700">Total Amount:</span>
              <span className="text-2xl font-bold text-blue-600">
                Rp {totalAmount.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-medium shadow-md"
            >
              Confirm Order
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
