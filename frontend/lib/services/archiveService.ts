import { supabase } from '../config/supabaseClient'
import { getCurrentUser } from '../utils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

// Archive types
export type ArchiveType = 'activity_logs' | 'sales' | 'staff_attendance' | 'all'
export type ArchiveFormat = 'pdf' | 'excel'

export interface ArchiveMetadata {
  archive_id: string
  generated_at: string
  period: {
    start: string
    end: string
    month: string
    year: string
  }
  data_types: string[]
  total_records: {
    activities?: number
    orders?: number
    attendance?: number
  }
  key_metrics: {
    total_revenue?: number
    total_orders?: number
    active_staff?: number
  }
  generated_by: string
  version: string
}

/**
 * Check if archive needed (first day of new month)
 */
export function shouldShowArchiveReminder(): boolean {
  const lastArchiveCheck = localStorage.getItem('last_archive_check')
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  
  if (lastArchiveCheck === today) {
    return false // Already checked today
  }
  
  // Check if it's first week of the month and last month not archived
  const currentDate = new Date()
  const dayOfMonth = currentDate.getDate()
  
  if (dayOfMonth <= 7) { // First week of month
    const lastMonthArchived = localStorage.getItem('last_month_archived')
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`
    
    return lastMonthArchived !== lastMonthKey
  }
  
  return false
}

/**
 * Dismiss archive reminder for today
 */
export function dismissArchiveReminder() {
  const today = new Date().toISOString().split('T')[0]
  localStorage.setItem('last_archive_check', today)
}

/**
 * Get previous month date range
 */
export function getPreviousMonthRange(): { start: string, end: string, month: string, year: string } {
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 0)
  
  return {
    start: lastMonth.toISOString().split('T')[0],
    end: lastDayOfMonth.toISOString().split('T')[0],
    month: lastMonth.toLocaleString('en-US', { month: 'long' }),
    year: String(lastMonth.getFullYear())
  }
}

/**
 * Archive Activity Logs
 */
export async function archiveActivityLogs(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .gte('timestamp', startDate)
    .lte('timestamp', `${endDate}T23:59:59`)
    .order('timestamp', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Archive Sales Data
 */
export async function archiveSalesData(startDate: string, endDate: string) {
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        product_name,
        quantity,
        base_price,
        total_price
      )
    `)
    .gte('created_at', startDate)
    .lte('created_at', `${endDate}T23:59:59`)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Calculate summary metrics
  const totalOrders = orders?.length || 0
  const totalRevenue = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  // Group by payment method
  const paymentMethods = orders?.reduce((acc: any, order) => {
    const method = order.payment_method || 'Unknown'
    acc[method] = (acc[method] || 0) + 1
    return acc
  }, {})

  // Group by order type
  const orderTypes = orders?.reduce((acc: any, order) => {
    const type = order.order_type || 'Unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})

  // Top selling products
  const productSales: { [key: string]: { quantity: number, revenue: number } } = {}
  orders?.forEach(order => {
    order.order_items?.forEach((item: any) => {
      if (!productSales[item.product_name]) {
        productSales[item.product_name] = { quantity: 0, revenue: 0 }
      }
      productSales[item.product_name].quantity += item.quantity
      productSales[item.product_name].revenue += item.total_price
    })
  })

  const topProducts = Object.entries(productSales)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  return {
    orders: orders || [],
    summary: {
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      avg_order_value: avgOrderValue,
      payment_methods: paymentMethods,
      order_types: orderTypes,
      top_products: topProducts
    }
  }
}

/**
 * Archive Staff Attendance
 */
export async function archiveStaffAttendance(startDate: string, endDate: string) {
  try {
    const { data: attendance, error } = await supabase
      .from('presensi_shift')
      .select(`
        *,
        staff (
          id,
          name,
          staff_code,
          role
        )
      `)
      .gte('tanggal', startDate)
      .lte('tanggal', endDate)
      .order('tanggal', { ascending: false })

    if (error) {
      console.warn('Staff attendance table not found or error:', error)
      // Return empty data if table doesn't exist
      return {
        attendance: [],
        summary: {
          total_records: 0,
          staff_metrics: []
        }
      }
    }

    // Calculate summary metrics
    const totalRecords = attendance?.length || 0
    
    // Group by staff
    const staffMetrics: { [key: string]: { 
      name: string
      total_days: number
      late_count: number
      early_departure: number
      total_hours: number
    } } = {}

    attendance?.forEach((record: any) => {
      const staffId = record.staff_id
      if (!staffMetrics[staffId]) {
        staffMetrics[staffId] = {
          name: record.staff?.name || 'Unknown',
          total_days: 0,
          late_count: 0,
          early_departure: 0,
          total_hours: 0
        }
      }
      
      staffMetrics[staffId].total_days++
      if (record.status === 'terlambat') staffMetrics[staffId].late_count++
      
      // Calculate hours if waktu_masuk and waktu_keluar exist
      if (record.waktu_masuk && record.waktu_keluar) {
        const clockIn = new Date(record.waktu_masuk)
        const clockOut = new Date(record.waktu_keluar)
        const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)
        staffMetrics[staffId].total_hours += hours
      }
    })

    return {
      attendance: attendance || [],
      summary: {
        total_records: totalRecords,
        staff_metrics: Object.entries(staffMetrics).map(([id, data]) => ({ staff_id: id, ...data }))
      }
    }
  } catch (err) {
    console.warn('Error fetching attendance, skipping...', err)
    // Return empty data on error
    return {
      attendance: [],
      summary: {
        total_records: 0,
        staff_metrics: []
      }
    }
  }
}

/**
 * Generate Archive Metadata
 */
function generateMetadata(
  period: { start: string, end: string, month: string, year: string },
  dataTypes: string[],
  records: any
): ArchiveMetadata {
  const currentUser = getCurrentUser()
  
  return {
    archive_id: `${period.year}-${String(new Date(`${period.month} 1, ${period.year}`).getMonth() + 1).padStart(2, '0')}`,
    generated_at: new Date().toISOString(),
    period,
    data_types: dataTypes,
    total_records: {
      activities: records.activities?.length || 0,
      orders: records.sales?.orders?.length || 0,
      attendance: records.attendance?.attendance?.length || 0
    },
    key_metrics: {
      total_revenue: records.sales?.summary?.total_revenue || 0,
      total_orders: records.sales?.summary?.total_orders || 0,
      active_staff: records.attendance?.summary?.staff_metrics?.length || 0
    },
    generated_by: currentUser?.name || 'Unknown',
    version: '1.0'
  }
}

/**
 * Generate Activity Log PDF
 */
function generateActivityLogPDF(data: any[], period: any): Blob {
  const doc = new jsPDF()
  
  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Activity Log Archive', 14, 20)
  
  // Period
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Period: ${period.month} ${period.year}`, 14, 28)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34)
  
  // Table
  const tableData = data.slice(0, 1000).map(log => [
    new Date(log.timestamp).toLocaleString('id-ID'),
    log.user_name || '-',
    log.action || '-',
    log.action_category || '-',
    log.severity || '-',
    (log.action_description || '').substring(0, 50)
  ])

  autoTable(doc, {
    startY: 40,
    head: [['Timestamp', 'User', 'Action', 'Category', 'Severity', 'Description']],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [0, 0, 0] }
  })

  return doc.output('blob')
}

/**
 * Generate Sales PDF
 */
function generateSalesPDF(data: any, period: any): Blob {
  const doc = new jsPDF()
  
  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Sales Archive', 14, 20)
  
  // Period
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Period: ${period.month} ${period.year}`, 14, 28)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34)
  
  // Summary
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Summary', 14, 45)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Total Orders: ${data.summary.total_orders}`, 14, 52)
  doc.text(`Total Revenue: Rp ${data.summary.total_revenue.toLocaleString('id-ID')}`, 14, 58)
  doc.text(`Avg Order Value: Rp ${Math.round(data.summary.avg_order_value).toLocaleString('id-ID')}`, 14, 64)
  
  // Top Products
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Top 10 Products', 14, 75)
  
  const productTableData = data.summary.top_products.map((p: any) => [
    p.name,
    p.quantity.toString(),
    `Rp ${p.revenue.toLocaleString('id-ID')}`
  ])

  autoTable(doc, {
    startY: 80,
    head: [['Product', 'Quantity Sold', 'Revenue']],
    body: productTableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [0, 0, 0] }
  })

  return doc.output('blob')
}

/**
 * Generate Staff Attendance PDF
 */
function generateAttendancePDF(data: any, period: any): Blob {
  const doc = new jsPDF()
  
  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Staff Attendance Archive', 14, 20)
  
  // Period
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Period: ${period.month} ${period.year}`, 14, 28)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34)
  
  // Summary
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Staff Summary', 14, 45)
  
  const staffTableData = data.summary.staff_metrics.map((s: any) => [
    s.name,
    s.total_days.toString(),
    s.late_count.toString(),
    s.early_departure.toString(),
    s.total_hours.toFixed(1)
  ])

  autoTable(doc, {
    startY: 50,
    head: [['Staff Name', 'Days Present', 'Late Count', 'Early Leave', 'Total Hours']],
    body: staffTableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [0, 0, 0] }
  })

  return doc.output('blob')
}

/**
 * Generate Activity Logs Excel
 */
function generateActivityLogExcel(data: any[], period: any): Blob {
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
  
  // Set column widths
  ws['!cols'] = [
    { wch: 18 }, // Timestamp
    { wch: 15 }, // User
    { wch: 10 }, // Role
    { wch: 12 }, // Action
    { wch: 12 }, // Category
    { wch: 40 }, // Description
    { wch: 20 }, // Resource
    { wch: 10 }  // Severity
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Activity Logs')
  
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

/**
 * Generate Sales Excel
 */
function generateSalesExcel(data: any, period: any): Blob {
  // Summary sheet
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

  // Orders sheet
  const orders_data = [
    ['Order ID', 'Date', 'Type', 'Payment Method', 'Total', 'Status']
  ]

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
    { wch: 25 }, // Order ID
    { wch: 18 }, // Date
    { wch: 12 }, // Type
    { wch: 15 }, // Payment
    { wch: 12 }, // Total
    { wch: 12 }  // Status
  ]

  // Top products sheet
  const products_data = [
    ['Product', 'Quantity Sold', 'Revenue']
  ]

  data.summary.top_products.forEach((product: any) => {
    products_data.push([
      product.product,
      product.quantity,
      product.revenue
    ])
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
function generateAttendanceExcel(data: any, period: any): Blob {
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
    { wch: 20 }, // Name
    { wch: 12 }, // Days
    { wch: 12 }, // Late
    { wch: 12 }, // Early
    { wch: 12 }  // Hours
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance Summary')
  
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

/**
 * Generate Activity Logs CSV for AI Analysis
 */
function generateActivityLogCSV(data: any[], period: any): Blob {
  const lines: string[] = []
  
  // Header with metadata
  lines.push('# Activity Logs Archive')
  lines.push(`# Period: ${period.month} ${period.year}`)
  lines.push(`# Generated: ${new Date().toISOString()}`)
  lines.push(`# Total Records: ${data.length}`)
  lines.push('')
  
  // CSV Header
  lines.push('Timestamp,User Name,User Role,Action,Action Category,Action Description,Resource Name,Severity')
  
  // Data rows
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
function generateSalesCSV(data: any, period: any): Blob {
  const lines: string[] = []
  
  // Metadata
  lines.push('# Sales Report Archive')
  lines.push(`# Period: ${period.month} ${period.year}`)
  lines.push(`# Generated: ${new Date().toISOString()}`)
  lines.push('')
  
  // Summary section
  lines.push('# SUMMARY')
  lines.push('Metric,Value')
  lines.push(`Total Orders,${data.summary.total_orders}`)
  lines.push(`Total Revenue,${data.summary.total_revenue}`)
  lines.push(`Average Order Value,${data.summary.avg_order_value}`)
  lines.push('')
  
  // Payment methods
  lines.push('# PAYMENT METHODS')
  lines.push('Method,Count')
  Object.entries(data.summary.payment_methods).forEach(([method, count]) => {
    lines.push(`${escapeCSV(method)},${count}`)
  })
  lines.push('')
  
  // Orders
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
  
  // Top products
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
function generateAttendanceCSV(data: any, period: any): Blob {
  const lines: string[] = []
  
  // Metadata
  lines.push('# Staff Attendance Archive')
  lines.push(`# Period: ${period.month} ${period.year}`)
  lines.push(`# Generated: ${new Date().toISOString()}`)
  lines.push(`# Total Staff: ${data.summary.staff_metrics.length}`)
  lines.push('')
  
  // Summary section
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

/**
 * Helper: Escape CSV values
 */
function escapeCSV(value: string): string {
  if (!value) return ''
  
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  
  return value
}

/**
 * Upload CSV files to Supabase Storage via API route (server-side)
 */
async function uploadCSVToStorage(
  archiveId: string,
  period: any,
  archiveData: any
): Promise<{ [key: string]: string }> {
  const csvPaths: { [key: string]: string } = {}
  
  // Extract year-month from archiveId (format: YYYY-MM)
  const [year, month] = archiveId.split('-')
  const folderPath = `${year}-${month}`
  
  console.log('Upload folder path:', folderPath)
  
  try {
    // Upload Activity Logs CSV
    if (archiveData.activities && archiveData.activities.length > 0) {
      const csvBlob = generateActivityLogCSV(archiveData.activities, period)
      const path = `${folderPath}/activity_logs_${archiveId}.csv`
      
      console.log('Uploading activity logs to:', path)
      
      const formData = new FormData()
      formData.append('file', csvBlob, 'activity_logs.csv')
      formData.append('path', path)
      
      const response = await fetch('/api/archives/upload-csv', {
        method: 'POST',
        credentials: 'include', // Send cookies automatically
        body: formData
      })
      
      const result = await response.json()
      
      if (result.error) {
        console.error('Error uploading activity logs CSV:', result.error)
      } else {
        csvPaths.activity_logs = path
        console.log('Activity logs uploaded successfully')
      }
    }
    
    // Upload Sales CSV
    if (archiveData.sales && archiveData.sales.orders) {
      const csvBlob = generateSalesCSV(archiveData.sales, period)
      const path = `${folderPath}/sales_${archiveId}.csv`
      
      console.log('Uploading sales to:', path)
      
      const formData = new FormData()
      formData.append('file', csvBlob, 'sales.csv')
      formData.append('path', path)
      
      const response = await fetch('/api/archives/upload-csv', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })
      
      const result = await response.json()
      
      if (result.error) {
        console.error('Error uploading sales CSV:', result.error)
      } else {
        csvPaths.sales = path
        console.log('Sales uploaded successfully')
      }
    }
    
    // Upload Attendance CSV
    if (archiveData.attendance && archiveData.attendance.summary) {
      const csvBlob = generateAttendanceCSV(archiveData.attendance, period)
      const path = `${folderPath}/attendance_${archiveId}.csv`
      
      console.log('Uploading attendance to:', path)
      
      const formData = new FormData()
      formData.append('file', csvBlob, 'attendance.csv')
      formData.append('path', path)
      
      const response = await fetch('/api/archives/upload-csv', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })
      
      const result = await response.json()
      
      if (result.error) {
        console.error('Error uploading attendance CSV:', result.error)
      } else {
        csvPaths.staff_attendance = path
        console.log('Attendance uploaded successfully')
      }
    }
    
    console.log('CSV files uploaded to storage:', csvPaths)
    return csvPaths
  } catch (error) {
    console.error('Error in uploadCSVToStorage:', error)
    return csvPaths // Return partial results
  }
}

/**
 * Main Archive Function - Generate all archives for a period
 */
export async function generateMonthlyArchive(
  types: ArchiveType[] = ['activity_logs', 'sales', 'staff_attendance'],
  format: ArchiveFormat = 'pdf'
): Promise<{ success: boolean, message: string, files?: any, archiveId?: string }> {
  try {
    console.log('Starting archive generation for types:', types)
    const period = getPreviousMonthRange()
    console.log('Archive period:', period)
    
    // Get current user for tracking
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }
    
    const archiveData: any = {}
    
    // Fetch data based on types
    if (types.includes('activity_logs')) {
      try {
        console.log('Fetching activity logs...')
        archiveData.activities = await archiveActivityLogs(period.start, period.end)
        console.log('Activity logs fetched:', archiveData.activities?.length || 0)
      } catch (err) {
        console.error('Error fetching activity logs:', err)
        throw new Error(`Failed to fetch activity logs: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    
    if (types.includes('sales')) {
      try {
        console.log('Fetching sales data...')
        archiveData.sales = await archiveSalesData(period.start, period.end)
        console.log('Sales data fetched:', archiveData.sales?.orders?.length || 0)
      } catch (err) {
        console.error('Error fetching sales data:', err)
        throw new Error(`Failed to fetch sales data: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    
    if (types.includes('staff_attendance')) {
      try {
        console.log('Fetching staff attendance...')
        archiveData.attendance = await archiveStaffAttendance(period.start, period.end)
        console.log('Attendance fetched:', archiveData.attendance?.attendance?.length || 0)
      } catch (err) {
        console.error('Error fetching attendance:', err)
        throw new Error(`Failed to fetch attendance: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    
    // Generate metadata
    console.log('Generating metadata...')
    const metadata = generateMetadata(period, types, archiveData)
    
    // Check if archive for this period already exists (using archive_id)
    console.log('Checking for existing archive with ID:', metadata.archive_id)
    
    const { data: existingArchives, error: checkError } = await supabase
      .from('archives')
      .select('archive_id, period_month, period_year, deleted_at')
      .eq('archive_id', metadata.archive_id)
    
    console.log('Existing archives found:', existingArchives)
    console.log('Check error:', checkError)
    
    if (existingArchives && existingArchives.length > 0) {
      const archive = existingArchives[0]
      
      // If archive is soft deleted, allow regeneration by restoring it
      if (archive.deleted_at) {
        console.log('Archive was soft deleted, will restore and regenerate')
        // We'll update the existing record instead of inserting new
      } else {
        console.log('Archive already exists and is active')
        return {
          success: false,
          message: `Archive for ${period.month} ${period.year} already exists. Please delete the existing archive first if you want to regenerate it.`,
          archiveId: archive.archive_id
        }
      }
    }
    
    // Save to database (upsert: restore if deleted, insert if new)
    console.log('Saving archive metadata to database...')
    const { data: archiveRecord, error: archiveError } = await supabase
      .from('archives')
      .upsert({
        archive_id: metadata.archive_id,
        period_month: period.month,
        period_year: period.year,
        generated_by: user.id,
        data_types: types,
        total_records: metadata.total_records,
        key_metrics: metadata.key_metrics,
        file_metadata: {
          has_activity_logs: !!archiveData.activities,
          has_sales: !!archiveData.sales,
          has_attendance: !!archiveData.attendance,
          generated_at: new Date().toISOString()
        },
        deleted_at: null, // Restore if was deleted
        deleted_by: null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'archive_id' // Use archive_id as unique key for upsert
      })
      .select()
      .single()
    
    if (archiveError) {
      console.error('Error saving to database:', archiveError)
      throw new Error(`Failed to save archive: ${archiveError.message}`)
    }
    
    console.log('Archive saved to database:', archiveRecord)
    
    // Upload CSV files to storage for AI analysis (via server-side API)
    console.log('Uploading CSV files to storage for AI...')
    const csvPaths = await uploadCSVToStorage(metadata.archive_id, period, archiveData)
    
    // Update archive record with CSV paths
    if (Object.keys(csvPaths).length > 0) {
      const { error: updateError } = await supabase
        .from('archives')
        .update({ csv_files: csvPaths })
        .eq('archive_id', metadata.archive_id)
      
      if (updateError) {
        console.error('Error updating CSV paths:', updateError)
      } else {
        console.log('CSV paths saved to database:', csvPaths)
      }
    }
    
    // Generate files
    console.log('Generating files with format:', format)
    const files: any = {}
    
    if (archiveData.activities) {
      try {
        console.log('Creating activity logs file...')
        if (format === 'excel') {
          files.activity_logs = generateActivityLogExcel(archiveData.activities, period)
        } else {
          files.activity_logs = generateActivityLogPDF(archiveData.activities, period)
        }
      } catch (err) {
        console.error('Error creating activity log file:', err)
        throw new Error(`Failed to create activity log file: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    
    if (archiveData.sales) {
      try {
        console.log('Creating sales file...')
        if (format === 'excel') {
          files.sales = generateSalesExcel(archiveData.sales, period)
        } else {
          files.sales = generateSalesPDF(archiveData.sales, period)
        }
      } catch (err) {
        console.error('Error creating sales file:', err)
        throw new Error(`Failed to create sales file: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    
    if (archiveData.attendance) {
      try {
        console.log('Creating attendance file...')
        if (format === 'excel') {
          files.attendance = generateAttendanceExcel(archiveData.attendance, period)
        } else {
          files.attendance = generateAttendancePDF(archiveData.attendance, period)
        }
      } catch (err) {
        console.error('Error creating attendance file:', err)
        throw new Error(`Failed to create attendance file: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    
    // Don't auto-download, user will download manually from card
    console.log('Files ready for download')
    
    // Mark as archived
    const archiveId = metadata.archive_id
    localStorage.setItem('last_month_archived', archiveId)
    localStorage.setItem('last_archive_check', new Date().toISOString().split('T')[0])
    
    console.log('Archive generation completed successfully')
    return {
      success: true,
      message: `Successfully archived ${period.month} ${period.year} data`,
      files,
      archiveId: metadata.archive_id
    }
  } catch (error: any) {
    console.error('Archive generation error (detailed):', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      error: error
    })
    return {
      success: false,
      message: error?.message || 'Failed to generate archive. Check console for details.'
    }
  }
}

/**
 * Delete archived data from database
 */
export async function deleteArchivedData(startDate: string, endDate: string, types: ArchiveType[]) {
  const results = []
  
  try {
    if (types.includes('activity_logs')) {
      const { error } = await supabase
        .from('activity_logs')
        .delete()
        .gte('timestamp', startDate)
        .lte('timestamp', `${endDate}T23:59:59`)
      
      if (error) throw error
      results.push('Activity logs deleted')
    }
    
    // Note: Orders and attendance biasanya tidak dihapus, hanya di-archive
    // Uncomment jika memang ingin auto-delete
    /*
    if (types.includes('sales')) {
      const { error } = await supabase
        .from('orders')
        .delete()
        .gte('created_at', startDate)
        .lte('created_at', `${endDate}T23:59:59`)
      
      if (error) throw error
      results.push('Orders deleted')
    }
    */
    
    return {
      success: true,
      message: results.join(', ')
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to delete archived data'
    }
  }
}

/**
 * Load all archives from database
 */
export async function loadArchivesFromDB(): Promise<ArchiveMetadata[]> {
  try {
    const { data, error } = await supabase
      .from('archives')
      .select(`
        *,
        generated_by_staff:staff!archives_generated_by_fkey(id, name)
      `)
      .is('deleted_at', null)
      .order('generated_at', { ascending: false })
    
    if (error) throw error
    
    // Transform to ArchiveMetadata format
    return (data || []).map(record => ({
      archive_id: record.archive_id,
      generated_at: record.generated_at,
      period: {
        start: '', // Not stored in DB, can be calculated
        end: '',
        month: record.period_month,
        year: record.period_year
      },
      data_types: record.data_types || [],
      total_records: record.total_records || {},
      key_metrics: record.key_metrics || {},
      generated_by: record.generated_by_staff?.name || 'Unknown',
      version: '1.0'
    }))
  } catch (error: any) {
    console.error('Error loading archives from DB:', error)
    return []
  }
}

/**
 * Soft delete archive from database
 */
export async function deleteArchiveFromDB(archiveId: string): Promise<{ success: boolean, message: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }
    
    // Get CSV file paths before deletion
    const { data: archive } = await supabase
      .from('archives')
      .select('csv_files')
      .eq('archive_id', archiveId)
      .single()
    
    // Delete CSV files from storage
    if (archive?.csv_files) {
      const csvPaths = Object.values(archive.csv_files) as string[]
      
      for (const path of csvPaths) {
        const { error: storageError } = await supabase.storage
          .from('archives')
          .remove([path])
        
        if (storageError) {
          console.error(`Error deleting CSV file ${path}:`, storageError)
        } else {
          console.log(`CSV file deleted: ${path}`)
        }
      }
    }
    
    // Soft delete the archive record
    const { error } = await supabase
      .from('archives')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id
      })
      .eq('archive_id', archiveId)
    
    if (error) throw error
    
    return {
      success: true,
      message: 'Archive deleted successfully'
    }
  } catch (error: any) {
    console.error('Error deleting archive:', error)
    return {
      success: false,
      message: error.message || 'Failed to delete archive'
    }
  }
}

/**
 * Download archive file without saving to database
 * Fetches data, generates file, and triggers download
 */
export async function downloadArchiveFile(
  archiveId: string, 
  fileType?: string, 
  format: 'pdf' | 'excel' = 'pdf'
): Promise<{ success: boolean, message: string }> {
  try {
    // Extract period from archiveId (format: YYYY-MM)
    const [year, month] = archiveId.split('-')
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const monthName = monthNames[parseInt(month) - 1]
    
    // Calculate date range
    const startDate = `${archiveId}-01`
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
    const endDate = `${archiveId}-${lastDay}`
    
    const period = { month: monthName, year, start: startDate, end: endDate }
    
    // Determine which files to download
    let filesToDownload: string[] = []
    if (fileType) {
      filesToDownload = [fileType]
    } else {
      filesToDownload = ['activity_logs', 'sales', 'staff_attendance']
    }
    
    // Fetch and generate files
    for (const type of filesToDownload) {
      let blob: Blob
      let fileName: string
      
      if (type === 'activity_logs') {
        const data = await archiveActivityLogs(period.start, period.end)
        if (format === 'excel') {
          blob = generateActivityLogExcel(data, period)
          fileName = `${archiveId}_activity_logs.xlsx`
        } else {
          blob = generateActivityLogPDF(data, period)
          fileName = `${archiveId}_activity_logs.pdf`
        }
      } else if (type === 'sales') {
        const data = await archiveSalesData(period.start, period.end)
        if (format === 'excel') {
          blob = generateSalesExcel(data, period)
          fileName = `${archiveId}_sales.xlsx`
        } else {
          blob = generateSalesPDF(data, period)
          fileName = `${archiveId}_sales.pdf`
        }
      } else if (type === 'staff_attendance') {
        const data = await archiveStaffAttendance(period.start, period.end)
        if (format === 'excel') {
          blob = generateAttendanceExcel(data, period)
          fileName = `${archiveId}_attendance.xlsx`
        } else {
          blob = generateAttendancePDF(data, period)
          fileName = `${archiveId}_attendance.pdf`
        }
      } else {
        continue
      }
      
      // Trigger download
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
    
    return {
      success: true,
      message: 'Files downloaded successfully'
    }
  } catch (error: any) {
    console.error('Error downloading archive:', error)
    return {
      success: false,
      message: error.message || 'Failed to download archive'
    }
  }
}
