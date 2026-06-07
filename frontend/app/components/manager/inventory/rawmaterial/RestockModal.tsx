'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
import { getCurrentUser } from '@/lib/utils'

interface InventoryItem {
  id: string
  name: string
  unit: string
  currentStock: number
  supplier: string
}

export type RestockPayload = {
  quantity: number
  notes: string
  costPerUnit?: number
  supplier?: string
  receiptUrl?: string
  receivedDate?: string
  expiryDate?: string
}

interface RestockModalProps {
  isOpen: boolean
  onClose: () => void
  item: InventoryItem | null
  onRestock: (itemId: string, payload: RestockPayload) => Promise<void>
}

const inputClass =
  'w-full rounded-lg border border-gray-900 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500'

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Failed to restock item.'
}

const parseNumber = (value: string) => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

const getBatchDateKey = (dateValue: string) =>
  (dateValue || new Date().toISOString().slice(0, 10)).replaceAll('-', '')

const buildBatchItemCode = (itemName: string) => {
  const normalized = itemName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
  const words = normalized.split(/\s+/).filter(Boolean)
  const code = words.length > 1
    ? words.map((word) => word[0]).join('')
    : words[0] || 'ITEM'
  return code.slice(0, 8)
}

const buildBatchPreview = (itemName: string, receivedDate: string) =>
  `B-${buildBatchItemCode(itemName)}-${getBatchDateKey(receivedDate)}-###`

const uploadInvoiceReceipt = async (file: File, itemId: string) => {
  const currentUser = getCurrentUser()
  if (!currentUser) {
    throw new Error('User session is required to upload receipt.')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('item_id', itemId)

  const response = await fetch('/api/manager/inventory/receipt', {
    method: 'POST',
    headers: {
      'x-user-id': currentUser.id,
      'x-user-name': currentUser.name,
      'x-user-role': currentUser.role,
    },
    body: formData,
  })

  const result = await response.json() as { success?: boolean; receiptUrl?: string; error?: string }

  if (!response.ok || !result.success || !result.receiptUrl) {
    throw new Error(result.error || 'Receipt could not be uploaded.')
  }

  return result.receiptUrl
}

export default function RestockModal({ isOpen, onClose, item, onRestock }: RestockModalProps) {
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [purchaseTotal, setPurchaseTotal] = useState('')
  const [supplier, setSupplier] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receivedDate, setReceivedDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const quantityRef = useRef<HTMLInputElement>(null)
  const costRef = useRef<HTMLInputElement>(null)
  const supplierRef = useRef<HTMLInputElement>(null)
  const receiptRef = useRef<HTMLInputElement>(null)
  const receivedDateRef = useRef<HTMLInputElement>(null)
  const itemId = item?.id || ''
  const itemSupplier = item?.supplier || ''

  useEffect(() => {
    if (!isOpen) {
      setQuantity('')
      setNotes('')
      setPurchaseTotal('')
      setSupplier('')
      setReceiptFile(null)
      setReceivedDate(new Date().toISOString().slice(0, 10))
      setExpiryDate('')
      setLoading(false)
      setAttemptedSubmit(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !itemId) return
    setSupplier(itemSupplier)
    setReceivedDate((current) => current || new Date().toISOString().slice(0, 10))
  }, [isOpen, itemId, itemSupplier])

  const quantityNumber = useMemo(() => parseNumber(quantity), [quantity])
  const purchaseTotalNumber = useMemo(() => parseNumber(purchaseTotal), [purchaseTotal])
  const unitCostNumber = quantityNumber > 0 && purchaseTotalNumber > 0 ? purchaseTotalNumber / quantityNumber : 0
  const newStock = item ? item.currentStock + quantityNumber : 0
  const batchPreview = item ? buildBatchPreview(item.name, receivedDate) : '-'
  const purchaseSupplier = supplier.trim()
  const invalidClass = (invalid: boolean) => attemptedSubmit && invalid ? 'border-red-400 bg-red-50' : ''

  if (!isOpen || !item) return null

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAttemptedSubmit(true)

    if (quantityNumber <= 0) {
      quantityRef.current?.focus()
      showError('Enter a valid restock quantity greater than 0.')
      return
    }

    if (purchaseTotalNumber <= 0) {
      costRef.current?.focus()
      showError('Purchase total is required and must be greater than 0.')
      return
    }

    if (expiryDate && receivedDate && expiryDate < receivedDate) {
      showError('Expiry date cannot be earlier than received date.')
      return
    }

    if (!supplier.trim()) {
      supplierRef.current?.focus()
      showError('Supplier is required for restock tracking.')
      return
    }

    if (!receivedDate) {
      receivedDateRef.current?.focus()
      showError('Received date is required for batch tracking.')
      return
    }

    if (!receiptFile) {
      receiptRef.current?.focus()
      showError('Receipt photo is required for restock audit.')
      return
    }

    setLoading(true)

    try {
      const receiptUrl = await uploadInvoiceReceipt(receiptFile, item.id)

      await onRestock(item.id, {
        quantity: quantityNumber,
        notes: notes.trim(),
        costPerUnit: unitCostNumber,
        supplier: supplier.trim(),
        receiptUrl,
        receivedDate: receivedDate || undefined,
        expiryDate: expiryDate || undefined,
      })
      setQuantity('')
      setNotes('')
      setPurchaseTotal('')
      setSupplier(item.supplier || '')
      setReceiptFile(null)
      setReceivedDate(new Date().toISOString().slice(0, 10))
      setExpiryDate('')
      setAttemptedSubmit(false)
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

        <form onSubmit={handleSubmit} noValidate className="min-h-0 overflow-y-auto p-6">
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
                      ref={quantityRef}
                      type="number"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      placeholder="0"
                      className={`${inputClass} pr-16 ${invalidClass(quantityNumber <= 0)}`}
                      min="0.01"
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
                    Purchase Total <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">
                      Rp
                    </span>
                    <input
                      ref={costRef}
                      type="number"
                      value={purchaseTotal}
                      onChange={(event) => setPurchaseTotal(event.target.value)}
                      placeholder="0"
                      className={`${inputClass} pl-11 ${invalidClass(purchaseTotalNumber <= 0)}`}
                      min="0.01"
                      step="0.01"
                      disabled={loading}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-400">Enter the total purchase price from the receipt. Unit cost is calculated automatically.</p>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800">Notes</label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Example: PO #12345 or supplier invoice note"
                  className={`${inputClass} min-h-28 resize-none`}
                  rows={4}
                  disabled={loading}
                />
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      Purchase Supplier <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={supplierRef}
                      type="text"
                      value={supplier}
                      onChange={(event) => setSupplier(event.target.value)}
                      placeholder="Supplier name"
                      className={`${inputClass} ${invalidClass(!supplier.trim())}`}
                      disabled={loading}
                    />
                    <p className="mt-2 text-xs text-gray-400">Use this when buying from a different supplier.</p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="mb-2 block text-sm font-semibold text-gray-800">
                    Receipt Photo <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={receiptRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
                    className={`w-full rounded-lg border bg-white px-4 py-3 text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white ${attemptedSubmit && !receiptFile ? 'border-red-400 bg-red-50' : 'border-gray-900'}`}
                    disabled={loading}
                    required
                  />
                  <p className="mt-2 text-xs text-gray-400">
                    Uploaded to the invoice bucket and linked to this restock batch.
                  </p>
                </div>

                <div className="mb-3 flex items-center gap-2">
                  <ArrowPathRoundedSquareIcon className="h-4 w-4 text-gray-700" />
                  <p className="text-sm font-semibold text-gray-900">Batch & Expiry</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      Received Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={receivedDateRef}
                      type="date"
                      value={receivedDate}
                      onChange={(event) => setReceivedDate(event.target.value)}
                      className={`${inputClass} ${invalidClass(!receivedDate)}`}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(event) => setExpiryDate(event.target.value)}
                      className={inputClass}
                      disabled={loading}
                    />
                  </div>
                </div>
                <p className="mt-3 text-xs leading-5 text-gray-500">
                  The system creates one batch per restock group. Split the restock only when supplier, expiry date, received date, or purchase cost is different.
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <CurrencyDollarIcon className="h-4 w-4 text-gray-700" />
                  <p className="text-sm font-semibold text-gray-900">Cost Summary</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500">Purchase Total</span>
                    <span className="font-semibold text-gray-900">
                      {purchaseTotalNumber > 0 ? formatCurrency(purchaseTotalNumber) : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-2">
                    <span className="text-gray-500">Unit Purchase Cost</span>
                    <span className="font-bold text-gray-900">
                      {unitCostNumber > 0 ? formatCurrency(unitCostNumber) : '-'}
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
                <p className="text-sm font-semibold text-gray-900">{purchaseSupplier || 'No supplier set'}</p>
                {item.supplier && purchaseSupplier !== item.supplier ? (
                  <p className="mt-2 text-xs font-semibold text-gray-500">
                    Previous supplier: {item.supplier}.
                  </p>
                ) : null}
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-900">Batch Preview</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-500">Batch</span>
                    <span className="font-semibold text-gray-900">{batchPreview}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-500">Received</span>
                    <span className="font-semibold text-gray-900">{receivedDate || '-'}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-500">Expiry</span>
                    <span className="font-semibold text-gray-900">{expiryDate || '-'}</span>
                  </div>
                </div>
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
              disabled={loading}
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
