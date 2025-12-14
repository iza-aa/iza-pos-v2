/**
 * CSV Generators
 * Generate CSV files for AI analysis
 */

import type { PeriodRange } from '@/lib/types/archive'

/**
 * Helper: Escape CSV values
 */
function escapeCSV(value: string): string {
  if (!value) return ''
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Generate Activity Logs CSV for AI Analysis
 */
export function generateActivityLogCSV(data: any[], period: PeriodRange): Blob {
  const lines: string[] = []
  
  lines.push('# Activity Logs Archive')
  lines.push(`# Period: ${period.month} ${period.year}`)
  lines.push(`# Generated: ${new Date().toISOString()}`)
  lines.push(`# Total Records: ${data.length}`)
  lines.push('')
  lines.push('Timestamp,User Name,User Role,Action,Action Category,Action Description,Resource Name,Severity')
  
  data.forEach(log => {
    const row = [
      new Date(log.timestamp).toISOString(),
      escapeCSV(log.user_name || ''),
      escapeCSV(log.user_role || ''),
      escapeCSV(log.action || ''),
      escapeCSV(log.action_category || ''),
      escapeCSV(log.action_description || ''),
      escapeCSV(log.resource_name || ''),
      escapeCSV(log.severity || 'info')
    ]
    lines.push(row.join(','))
  })
  
  return new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
}

/**
 * Generate Sales CSV for AI Analysis
 */
export function generateSalesCSV(data: any, period: PeriodRange): Blob {
  const lines: string[] = []
  
  lines.push('# Sales Report Archive')
  lines.push(`# Period: ${period.month} ${period.year}`)
  lines.push(`# Generated: ${new Date().toISOString()}`)
  lines.push('')
  lines.push('# SUMMARY')
  lines.push('Metric,Value')
  lines.push(`Total Orders,${data.summary.total_orders}`)
  lines.push(`Total Revenue,${data.summary.total_revenue}`)
  lines.push(`Average Order Value,${data.summary.avg_order_value}`)
  lines.push('')
  lines.push('# PAYMENT METHODS')
  lines.push('Method,Count')
  Object.entries(data.summary.payment_methods).forEach(([method, count]) => {
    lines.push(`${escapeCSV(method)},${count}`)
  })
  lines.push('')
  lines.push('# ORDERS')
  lines.push('Order ID,Created At,Order Type,Payment Method,Total,Status')
  data.orders.forEach((order: any) => {
    const row = [
      escapeCSV(order.id || ''),
      new Date(order.created_at).toISOString(),
      escapeCSV(order.order_type || ''),
      escapeCSV(order.payment_method || ''),
      order.total || 0,
      escapeCSV(order.status || 'completed')
    ]
    lines.push(row.join(','))
  })
  lines.push('')
  lines.push('# TOP PRODUCTS')
  lines.push('Product,Quantity Sold,Revenue')
  data.summary.top_products.forEach((product: any) => {
    const row = [
      escapeCSV(product.product || ''),
      product.quantity || 0,
      product.revenue || 0
    ]
    lines.push(row.join(','))
  })
  
  return new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
}

/**
 * Generate Staff Attendance CSV for AI Analysis
 */
export function generateAttendanceCSV(data: any, period: PeriodRange): Blob {
  const lines: string[] = []
  
  lines.push('# Staff Attendance Archive')
  lines.push(`# Period: ${period.month} ${period.year}`)
  lines.push(`# Generated: ${new Date().toISOString()}`)
  lines.push(`# Total Staff: ${data.summary.staff_metrics.length}`)
  lines.push('')
  lines.push('# ATTENDANCE SUMMARY')
  lines.push('Staff Name,Total Days Present,Late Count,Early Departures,Total Hours Worked')
  
  data.summary.staff_metrics.forEach((s: any) => {
    const row = [
      escapeCSV(s.name || ''),
      s.total_days || 0,
      s.late_count || 0,
      s.early_departure || 0,
      s.total_hours?.toFixed(2) || '0.00'
    ]
    lines.push(row.join(','))
  })
  
  return new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
}
