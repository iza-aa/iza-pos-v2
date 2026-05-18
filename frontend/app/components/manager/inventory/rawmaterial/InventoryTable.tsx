'use client'

import { useState } from 'react'
import {
  EllipsisVerticalIcon,
  ArrowUpTrayIcon,
  AdjustmentsHorizontalIcon,
  PencilIcon,
  TrashIcon,
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

interface InventoryTableProps {
  items: InventoryItem[]
  onRestock: (item: InventoryItem) => void
  onAdjust: (item: InventoryItem) => void
  onEdit: (item: InventoryItem) => void
  onDelete: (item: InventoryItem) => void
}

const normalizeStatus = (item: InventoryItem) => {
  const normalized = String(item.status || '').toLowerCase().trim()

  if (normalized === 'in-stock' || normalized === 'good') return 'in-stock'
  if (normalized === 'low-stock' || normalized === 'low') return 'low-stock'
  if (normalized === 'out-of-stock' || normalized === 'critical') return 'out-of-stock'

  if (item.currentStock <= 0) return 'out-of-stock'
  if (item.currentStock <= item.reorderLevel) return 'low-stock'

  return 'in-stock'
}

const getStatusMeta = (status: 'in-stock' | 'low-stock' | 'out-of-stock') => {
  switch (status) {
    case 'in-stock':
      return {
        label: 'In Stock',
        className: 'bg-[#B2FF5E] text-gray-900 border border-[#9BEF43]',
      }
    case 'low-stock':
      return {
        label: 'Low Stock',
        className: 'bg-[#FFE02E] text-gray-900 border border-[#F4CF12]',
      }
    case 'out-of-stock':
      return {
        label: 'Critical',
        className: 'bg-[#FF6859] text-white border border-[#EF5142]',
      }
    default:
      return {
        label: 'Unknown',
        className: 'bg-gray-100 text-gray-700 border border-gray-200',
      }
  }
}

const getStockTextClassName = (status: 'in-stock' | 'low-stock' | 'out-of-stock') => {
  if (status === 'out-of-stock') return 'text-[#FF6859]'
  if (status === 'low-stock') return 'text-[#D8A800]'
  return 'text-gray-900'
}

const formatRestockedDate = (value: string) => {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function InventoryTable({
  items,
  onRestock,
  onAdjust,
  onEdit,
  onDelete,
}: InventoryTableProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl bg-white">
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[1000px] table-fixed">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr className="border-b border-gray-200">
              <th className="w-[14%] px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Item Name
              </th>
              <th className="w-[11%] px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Category
              </th>
              <th className="w-[12%] px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Stock
              </th>
              <th className="w-[12%] px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Reorder
              </th>
              <th className="w-[14%] px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Supplier
              </th>
              <th className="w-[12%] px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Restocked
              </th>
              <th className="w-[11%] px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {items.map((item) => {
              const normalizedStatus = normalizeStatus(item)
              const statusMeta = getStatusMeta(normalizedStatus)

              return (
                <tr key={item.id} className="transition hover:bg-gray-50">
                  <td className="w-[14%] whitespace-nowrap px-6 py-4">
                    <div className="truncate text-sm font-medium text-gray-900">{item.name}</div>
                  </td>
                  <td className="w-[11%] whitespace-nowrap px-6 py-4">
                    <div className="truncate text-sm text-gray-700">{item.category}</div>
                  </td>
                  <td className="w-[12%] whitespace-nowrap px-6 py-4">
                    <div className={`text-sm font-semibold ${getStockTextClassName(normalizedStatus)}`}>
                      {item.currentStock} {item.unit}
                    </div>
                  </td>
                  <td className="w-[12%] whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-700">
                      {item.reorderLevel} {item.unit}
                    </div>
                  </td>
                  <td className="w-[14%] whitespace-nowrap px-6 py-4">
                    <div className="truncate text-sm text-gray-700">{item.supplier || '-'}</div>
                  </td>
                  <td className="w-[12%] whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-700">{formatRestockedDate(item.lastRestocked)}</div>
                  </td>
                  <td className="w-[11%] whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-semibold ${statusMeta.className}`}
                    >
                      {statusMeta.label}
                    </span>
                  </td>
                  <td className="w-[14%] whitespace-nowrap px-6 py-4 text-left">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenDropdown(openDropdown === item.id ? null : item.id)}
                        className="rounded-lg p-2 transition hover:bg-gray-100"
                        aria-label={`Open actions for ${item.name}`}
                      >
                        <EllipsisVerticalIcon className="h-5 w-5 text-gray-600" />
                      </button>

                      {openDropdown === item.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenDropdown(null)}
                          />

                          <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                            <button
                              type="button"
                              onClick={() => {
                                onRestock(item)
                                setOpenDropdown(null)
                              }}
                              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100"
                            >
                              <ArrowUpTrayIcon className="h-5 w-5 text-gray-600" />
                              <div>
                                <div className="font-medium">Restock</div>
                                <div className="text-xs text-gray-500">Add from supplier</div>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                onAdjust(item)
                                setOpenDropdown(null)
                              }}
                              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100"
                            >
                              <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-600" />
                              <div>
                                <div className="font-medium">Adjust Stock</div>
                                <div className="text-xs text-gray-500">Correction/damaged</div>
                              </div>
                            </button>

                            <div className="my-1 border-t border-gray-200" />

                            <button
                              type="button"
                              onClick={() => {
                                onEdit(item)
                                setOpenDropdown(null)
                              }}
                              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100"
                            >
                              <PencilIcon className="h-5 w-5 text-gray-600" />
                              <div>
                                <div className="font-medium">Edit Details</div>
                                <div className="text-xs text-gray-500">Name, category, etc</div>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                onDelete(item)
                                setOpenDropdown(null)
                              }}
                              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                            >
                              <TrashIcon className="h-5 w-5 text-red-600" />
                              <div>
                                <div className="font-medium">Delete</div>
                                <div className="text-xs text-red-500">Remove item</div>
                              </div>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}