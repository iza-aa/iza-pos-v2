'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import QRCode from 'qrcode'

interface QRISPaymentProps {
  orderNumber: string
  totalAmount: number
  onPaymentConfirmed: () => Promise<void>
  onCancel: () => void
}

export default function QRISPayment({ orderNumber, totalAmount, onPaymentConfirmed, onCancel }: QRISPaymentProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [countdown, setCountdown] = useState(300) // 5 minutes

  useEffect(() => {
    generateQRCode()
  }, [orderNumber, totalAmount])

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown(prev => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [countdown])

  const generateQRCode = async () => {
    try {
      // Format QRIS payload (simplified - in production use proper QRIS format)
      const qrisData = `00020101021226660014ID.CO.QRIS.WWW0215ID${Date.now()}02150000000000000000303UME51440014ID.CO.BANK.WWW0215${orderNumber}520454995303360540${totalAmount}5802ID5913IZA Restaurant6007Jakarta610711111626220318${orderNumber}6304`
      
      const url = await QRCode.toDataURL(qrisData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      
      setQrCodeUrl(url)
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleConfirmPayment = async () => {
    setIsProcessing(true)
    // Simulate payment confirmation delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    try {
      await onPaymentConfirmed()
    } catch {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Pay with QRIS</h2>
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="p-2 hover:bg-gray-100 rounded-full transition disabled:opacity-50"
          >
            <XMarkIcon className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Amount */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600 mb-1">Total Payment</p>
            <p className="text-3xl font-bold text-gray-900">
              Rp {totalAmount.toLocaleString('id-ID')}
            </p>
          </div>

          {/* QR Code */}
          <div className="bg-white p-6 rounded-xl border-2 border-gray-200 mb-6 flex flex-col items-center">
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="QRIS Code" className="w-64 h-64" />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            )}
            <p className="text-sm text-gray-500 mt-4 text-center">
              Scan this QR code with any banking app
            </p>
          </div>

          {/* Timer */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-amber-800">Time remaining</span>
              <span className="text-lg font-bold text-amber-900">{formatTime(countdown)}</span>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-3 mb-6">
            <h3 className="font-semibold text-gray-900 text-sm">How to pay:</h3>
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2">
                <span className="font-semibold text-gray-900">1.</span>
                <span>Open your banking or e-wallet app</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-gray-900">2.</span>
                <span>Select QRIS or Scan QR option</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-gray-900">3.</span>
                <span>Scan the QR code above</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-gray-900">4.</span>
                <span>Verify the amount and confirm payment</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-gray-900">5.</span>
                <span>Click "I've Paid" button below</span>
              </li>
            </ol>
          </div>

          {/* Order Info */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Order Number</span>
              <span className="font-semibold text-gray-900">{orderNumber}</span>
            </div>
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirmPayment}
            disabled={isProcessing || countdown <= 0}
            className="w-full py-4 bg-green-600 text-white rounded-xl font-semibold text-lg hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Processing...</span>
              </>
            ) : countdown <= 0 ? (
              'Payment Expired'
            ) : (
              <>
                <CheckCircleIcon className="w-6 h-6" />
                <span>I've Paid</span>
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            Please wait after payment. Your order will be processed automatically.
          </p>
        </div>
      </div>
    </div>
  )
}
