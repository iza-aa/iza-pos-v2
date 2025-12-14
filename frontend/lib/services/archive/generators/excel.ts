/**
 * Excel Generators
 * Generate Excel spreadsheets for archive files
 */

import * as XLSX from 'xlsx'
import type { PeriodRange } from '@/lib/types/archive'

/**
 * Generate Activity Logs Excel
 */
export function generateActivityLogExcel(data: any[], period: PeriodRange): Blob {
  const ws_data = [
    ['Activity Logs Archive'],
    [`Period: ${period.month} ${period.year}`],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    ['Timestamp', 'User', 'Role', 'Action', 'Category', 'Description', 'Resource', 'Severity']
  ]

  data.forEach(log => {
    ws_data.push([
      new Date(log.timestamp).toLocaleString(),
      log.user_name,
      log.user_role,
      log.action,
      log.action_category,
      log.action_description,
      log.resource_name || '-',
      log.severity || 'info'
    ])
  })

  const ws = XLSX.utils.aoa_to_sheet(ws_data)
  
  ws['!cols'] = [
    { wch: 18 }, { wch: 15 }, { wch: 10 }, { wch: 12 },
    { wch: 12 }, { wch: 40 }, { wch: 20 }, { wch: 10 }
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Activity Logs')
  
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

/**
 * Generate Sales Excel
 */
export function generateSalesExcel(data: any, period: PeriodRange): Blob {
  const summary_data = [
    ['Sales Report Archive'],
    [`Period: ${period.month} ${period.year}`],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    ['Metric', 'Value'],
    ['Total Orders', data.summary.total_orders],
    ['Total Revenue', `Rp ${data.summary.total_revenue.toLocaleString('id-ID')}`],
    ['Average Order Value', `Rp ${data.summary.avg_order_value.toLocaleString('id-ID')}`],
    [],
    ['Payment Methods'],
    ['Method', 'Count'],
    ...Object.entries(data.summary.payment_methods).map(([method, count]) => [method, count])
  ]

  const ws_summary = XLSX.utils.aoa_to_sheet(summary_data)
  ws_summary['!cols'] = [{ wch: 20 }, { wch: 20 }]

  const orders_data = [['Order ID', 'Date', 'Type', 'Payment Method', 'Total', 'Status']]
  data.orders.forEach((order: any) => {
    orders_data.push([
      order.id,
      new Date(order.created_at).toLocaleString(),
      order.order_type || '-',
      order.payment_method || '-',
      order.total,
      order.status || 'completed'
    ])
  })

  const ws_orders = XLSX.utils.aoa_to_sheet(orders_data)
  ws_orders['!cols'] = [
    { wch: 25 }, { wch: 18 }, { wch: 12 },
    { wch: 15 }, { wch: 12 }, { wch: 12 }
  ]

  const products_data = [['Product', 'Quantity Sold', 'Revenue']]
  data.summary.top_products.forEach((product: any) => {
    products_data.push([product.product, product.quantity, product.revenue])
  })

  const ws_products = XLSX.utils.aoa_to_sheet(products_data)
  ws_products['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws_summary, 'Summary')
  XLSX.utils.book_append_sheet(wb, ws_orders, 'Orders')
  XLSX.utils.book_append_sheet(wb, ws_products, 'Top Products')
  
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

/**
 * Generate Staff Attendance Excel
 */
export function generateAttendanceExcel(data: any, period: PeriodRange): Blob {
  const ws_data = [
    ['Staff Attendance Archive'],
    [`Period: ${period.month} ${period.year}`],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    ['Staff Name', 'Days Present', 'Late Count', 'Early Leave', 'Total Hours']
  ]

  data.summary.staff_metrics.forEach((s: any) => {
    ws_data.push([
      s.name,
      s.total_days,
      s.late_count,
      s.early_departure,
      s.total_hours.toFixed(1)
    ])
  })

  const ws = XLSX.utils.aoa_to_sheet(ws_data)
  ws['!cols'] = [
    { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance Summary')
  
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
