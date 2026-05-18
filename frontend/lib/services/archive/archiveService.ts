import { supabase } from '../../config/supabaseClient'
import { getCurrentUser } from '../../utils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

// Archive types
export type ArchiveType = 'activity_logs' | 'sales' | 'staff_attendance' | 'all'
export type ArchiveFormat = 'pdf' | 'excel'



type ArchivePeriodType = 'monthly' | 'custom_range'

type PeriodRange = {
  start: string
  end: string
  month: string
  year: string
  archiveType?: ArchivePeriodType
}

export type ArchiveGenerationOptions = {
  startDate?: string
  endDate?: string
  types?: ArchiveType[]
  format?: ArchiveFormat
}

type CellValue = string | number

type ActivityLogRecord = {
  id?: string
  timestamp: string
  user_name?: string | null
  user_role?: string | null
  action?: string | null
  action_category?: string | null
  action_description?: string | null
  resource_name?: string | null
  severity?: string | null
}

type OrderItemRecord = {
  product_name: string
  quantity: number
  base_price?: number | null
  total_price: number
}

type SalesOrderRecord = {
  id: string
  created_at: string
  order_type?: string | null
  payment_method?: string | null
  total?: number | null
  status?: string | null
  order_items?: OrderItemRecord[] | null
}

type TopProduct = {
  name: string
  quantity: number
  revenue: number
}

type SalesSummary = {
  total_orders: number
  total_revenue: number
  avg_order_value: number
  payment_methods: Record<string, number>
  order_types: Record<string, number>
  top_products: TopProduct[]
}

type SalesArchiveData = {
  orders: SalesOrderRecord[]
  summary: SalesSummary
}

type StaffInfo = {
  id?: string
  name?: string | null
  staff_code?: string | null
  role?: string | null
}

type AttendanceRecord = {
  id?: string
  staff_id: string
  tanggal: string
  status?: string | null
  waktu_masuk?: string | null
  waktu_keluar?: string | null
  check_in_status?: string | null
  check_out_status?: string | null
  staff?: StaffInfo | null
}

type AttendanceDbRecord = {
  id?: string
  staff_id: string
  attendance_date: string
  clock_in_at?: string | null
  clock_out_at?: string | null
  check_in_status?: string | null
  check_out_status?: string | null
}

type StaffMetric = {
  staff_id: string
  name: string
  total_days: number
  late_count: number
  early_departure: number
  total_hours: number
}

type AttendanceArchiveData = {
  attendance: AttendanceRecord[]
  summary: {
    total_records: number
    staff_metrics: StaffMetric[]
  }
}

type ArchiveData = {
  activities?: ActivityLogRecord[]
  sales?: SalesArchiveData
  attendance?: AttendanceArchiveData
}

type ArchiveFiles = Partial<Record<'activity_logs' | 'sales' | 'attendance', Blob>>

type ArchiveResult = {
  success: boolean
  message: string
  files?: ArchiveFiles
  archiveId?: string
}

type ArchiveDbRecord = {
  archive_id: string
  generated_at: string
  period_month: string
  period_year: string
  period_start_date?: string | null
  period_end_date?: string | null
  archive_type?: ArchivePeriodType | string | null
  data_types?: string[] | null
  total_records?: unknown
  key_metrics?: ArchiveMetadata['key_metrics'] | null
  generated_by_staff?: {
    name?: string | null
  } | null
}

type ExistingArchiveRecord = {
  archive_id: string
  period_month: string
  period_year: string
  period_start_date?: string | null
  period_end_date?: string | null
  archive_type?: ArchivePeriodType | string | null
  deleted_at?: string | null
}




function getArchiveMonthNumber(monthName: string): number {
  const monthIndex = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december'
  ].indexOf(monthName.toLowerCase())

  return monthIndex >= 0 ? monthIndex + 1 : 1
}

function getArchiveRecordPeriod(record: ArchiveDbRecord): Pick<PeriodRange, 'start' | 'end'> {
  if (record.period_start_date && record.period_end_date) {
    return {
      start: record.period_start_date,
      end: record.period_end_date
    }
  }

  const year = Number(record.period_year)
  const month = getArchiveMonthNumber(record.period_month)
  const safeYear = Number.isFinite(year) ? year : new Date().getFullYear()
  const paddedMonth = String(month).padStart(2, '0')
  const lastDay = new Date(safeYear, month, 0).getDate()

  return {
    start: `${safeYear}-${paddedMonth}-01`,
    end: `${safeYear}-${paddedMonth}-${String(lastDay).padStart(2, '0')}`
  }
}

function normalizeDateInput(value: string): string {
  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid archive date range')
  }

  return date.toISOString().split('T')[0]
}

function getMonthNameFromDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleString('en-US', { month: 'long' })
}

function getYearFromDate(value: string): string {
  return String(new Date(`${value}T00:00:00`).getFullYear())
}

function getLastDayOfMonth(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)

  return lastDay.toISOString().split('T')[0]
}

function isFullMonthRange(startDate: string, endDate: string): boolean {
  const normalizedStart = normalizeDateInput(startDate)
  const normalizedEnd = normalizeDateInput(endDate)
  const start = new Date(`${normalizedStart}T00:00:00`)

  return normalizedStart.endsWith('-01') && normalizedEnd === getLastDayOfMonth(normalizedStart) && start.getDate() === 1
}

function createArchiveId(startDate: string, endDate: string): string {
  if (isFullMonthRange(startDate, endDate)) {
    return `${startDate.slice(0, 7)}`
  }

  return `archive_${startDate}_to_${endDate}`
}

function buildPeriodRange(startDate: string, endDate: string): PeriodRange {
  const start = normalizeDateInput(startDate)
  const end = normalizeDateInput(endDate)

  if (new Date(`${start}T00:00:00`).getTime() > new Date(`${end}T00:00:00`).getTime()) {
    throw new Error('Start date cannot be later than end date')
  }

  return {
    start,
    end,
    month: getMonthNameFromDate(start),
    year: getYearFromDate(start),
    archiveType: isFullMonthRange(start, end) ? 'monthly' : 'custom_range'
  }
}

function getArchivePeriodLabel(period: PeriodRange): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  })

  const start = formatter.format(new Date(`${period.start}T00:00:00`))
  const end = formatter.format(new Date(`${period.end}T00:00:00`))

  if (period.archiveType === 'monthly') {
    return `${period.month} ${period.year}`
  }

  return `${start} - ${end}`
}

type TotalRecords = ArchiveMetadata['total_records']

type RawTotalRecords = {
  activities?: unknown
  activity_logs?: unknown
  orders?: unknown
  sales?: unknown
  attendance?: unknown
  staff_attendance?: unknown
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function normalizeTotalRecords(value: unknown): TotalRecords {
  if (!value || typeof value !== 'object') {
    return {
      activities: 0,
      orders: 0,
      attendance: 0
    }
  }

  const records = value as RawTotalRecords

  return {
    activities: toNumber(records.activities ?? records.activity_logs),
    orders: toNumber(records.orders ?? records.sales),
    attendance: toNumber(records.attendance ?? records.staff_attendance)
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.length > 0) {
      return message
    }
  }

  return fallback
}

export interface ArchiveMetadata {
  archive_id: string
  generated_at: string
  period: {
    start: string
    end: string
    month: string
    year: string
  }
  archive_type?: ArchivePeriodType | string
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
 * Get current month date range.
 *
 * Archive generation in this app is based on the active/current month,
 * so when the current date is in May it will generate the May archive,
 * not the previous month archive.
 */
export function getCurrentMonthRange(): PeriodRange {
  const now = new Date()
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const today = now.toISOString().split('T')[0]

  return buildPeriodRange(currentMonth.toISOString().split('T')[0], today)
}

export function getFullCurrentMonthRange(): PeriodRange {
  const now = new Date()
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  return buildPeriodRange(
    currentMonth.toISOString().split('T')[0],
    lastDayOfMonth.toISOString().split('T')[0]
  )
}

export function getArchiveRange(startDate?: string, endDate?: string): PeriodRange {
  if (startDate && endDate) {
    return buildPeriodRange(startDate, endDate)
  }

  return getCurrentMonthRange()
}

/**
 * Backward-compatible alias for components that still import getPreviousMonthRange.
 * It now returns the current archive month to match the updated UX.
 */
export function getPreviousMonthRange(): PeriodRange {
  return getCurrentMonthRange()
}

/**
 * Archive Activity Logs
 */
export async function archiveActivityLogs(startDate: string, endDate: string): Promise<ActivityLogRecord[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .gte('timestamp', startDate)
    .lte('timestamp', `${endDate}T23:59:59`)
    .order('timestamp', { ascending: false })

  if (error) throw error
  return (data || []) as ActivityLogRecord[]
}

/**
 * Archive Sales Data
 */
export async function archiveSalesData(startDate: string, endDate: string): Promise<SalesArchiveData> {
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

  const typedOrders = (orders || []) as SalesOrderRecord[]

  // Calculate summary metrics
  const totalOrders = typedOrders.length
  const totalRevenue = typedOrders.reduce((sum, order) => sum + (order.total || 0), 0)
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  // Group by payment method
  const paymentMethods = typedOrders.reduce<Record<string, number>>((acc, order) => {
    const method = order.payment_method || 'Unknown'
    acc[method] = (acc[method] || 0) + 1
    return acc
  }, {})

  // Group by order type
  const orderTypes = typedOrders.reduce<Record<string, number>>((acc, order) => {
    const type = order.order_type || 'Unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})

  // Top selling products
  const productSales: Record<string, { quantity: number, revenue: number }> = {}
  typedOrders.forEach(order => {
    order.order_items?.forEach((item) => {
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
    orders: typedOrders,
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
export async function archiveStaffAttendance(startDate: string, endDate: string): Promise<AttendanceArchiveData> {
  try {
    const { data: attendanceRows, error } = await supabase
      .from('attendance')
      .select('id, staff_id, attendance_date, clock_in_at, clock_out_at, check_in_status, check_out_status')
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .order('attendance_date', { ascending: false })

    if (error) {
      console.warn('Staff attendance table not found or error:', error)
      return {
        attendance: [],
        summary: {
          total_records: 0,
          staff_metrics: []
        }
      }
    }

    const typedRows = (attendanceRows || []) as AttendanceDbRecord[]
    const staffIds = Array.from(new Set(typedRows.map((row) => row.staff_id).filter(Boolean)))
    const staffMap = new Map<string, StaffInfo>()

    if (staffIds.length > 0) {
      const { data: staffRows, error: staffError } = await supabase
        .from('staff')
        .select('id, name, staff_code, role')
        .in('id', staffIds)

      if (staffError) {
        console.warn('Staff lookup failed, continuing without staff names:', staffError)
      } else {
        ;((staffRows || []) as StaffInfo[]).forEach((staff) => {
          if (staff.id) {
            staffMap.set(staff.id, staff)
          }
        })
      }
    }

    const typedAttendance: AttendanceRecord[] = typedRows.map((row) => ({
      id: row.id,
      staff_id: row.staff_id,
      tanggal: row.attendance_date,
      status: row.check_in_status ?? row.check_out_status ?? null,
      waktu_masuk: row.clock_in_at ?? null,
      waktu_keluar: row.clock_out_at ?? null,
      check_in_status: row.check_in_status ?? null,
      check_out_status: row.check_out_status ?? null,
      staff: staffMap.get(row.staff_id) ?? null
    }))

    const totalRecords = typedAttendance.length
    const staffMetrics: Record<string, Omit<StaffMetric, 'staff_id'>> = {}

    typedAttendance.forEach((record) => {
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

      const checkInStatus = (record.check_in_status ?? record.status ?? '').toLowerCase()
      const checkOutStatus = (record.check_out_status ?? '').toLowerCase()

      if (checkInStatus.includes('late') || checkInStatus.includes('terlambat')) {
        staffMetrics[staffId].late_count++
      }

      if (
        checkOutStatus.includes('early') ||
        checkOutStatus.includes('pulang_cepat') ||
        checkOutStatus.includes('early_leave')
      ) {
        staffMetrics[staffId].early_departure++
      }

      if (record.waktu_masuk && record.waktu_keluar) {
        const clockIn = new Date(record.waktu_masuk)
        const clockOut = new Date(record.waktu_keluar)
        const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)

        if (Number.isFinite(hours) && hours > 0) {
          staffMetrics[staffId].total_hours += hours
        }
      }
    })

    return {
      attendance: typedAttendance,
      summary: {
        total_records: totalRecords,
        staff_metrics: Object.entries(staffMetrics).map(([id, data]) => ({ staff_id: id, ...data }))
      }
    }
  } catch (err) {
    console.warn('Error fetching attendance, skipping...', err)
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
  period: PeriodRange,
  dataTypes: string[],
  records: ArchiveData
): ArchiveMetadata {
  const currentUser = getCurrentUser()

  return {
    archive_id: createArchiveId(period.start, period.end),
    generated_at: new Date().toISOString(),
    period,
    archive_type: period.archiveType,
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
function generateActivityLogPDF(data: ActivityLogRecord[], period: PeriodRange): Blob {
  const doc = new jsPDF()
  
  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Activity Log Archive', 14, 20)
  
  // Period
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Period: ${getArchivePeriodLabel(period)}`, 14, 28)
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
function generateSalesPDF(data: SalesArchiveData, period: PeriodRange): Blob {
  const doc = new jsPDF()
  
  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Sales Archive', 14, 20)
  
  // Period
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Period: ${getArchivePeriodLabel(period)}`, 14, 28)
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
  
  const productTableData = data.summary.top_products.map((p) => [
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
function generateAttendancePDF(data: AttendanceArchiveData, period: PeriodRange): Blob {
  const doc = new jsPDF()
  
  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Staff Attendance Archive', 14, 20)
  
  // Period
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Period: ${getArchivePeriodLabel(period)}`, 14, 28)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34)
  
  // Summary
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Staff Summary', 14, 45)
  
  const staffTableData = data.summary.staff_metrics.map((s) => [
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
function generateActivityLogExcel(data: ActivityLogRecord[], period: PeriodRange): Blob {
  const ws_data: CellValue[][] = [
    ['Activity Logs Archive'],
    [`Period: ${getArchivePeriodLabel(period)}`],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    ['Timestamp', 'User', 'Role', 'Action', 'Category', 'Description', 'Resource', 'Severity']
  ]

  data.forEach(log => {
    ws_data.push([
      new Date(log.timestamp).toLocaleString(),
      log.user_name ?? '-',
      log.user_role ?? '-',
      log.action ?? '-',
      log.action_category ?? '-',
      log.action_description ?? '-',
      log.resource_name ?? '-',
      log.severity ?? 'info'
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
function generateSalesExcel(data: SalesArchiveData, period: PeriodRange): Blob {
  // Summary sheet
  const summary_data: CellValue[][] = [
    ['Sales Report Archive'],
    [`Period: ${getArchivePeriodLabel(period)}`],
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
  const orders_data: CellValue[][] = [
    ['Order ID', 'Date', 'Type', 'Payment Method', 'Total', 'Status']
  ]

  data.orders.forEach((order) => {
    orders_data.push([
      order.id,
      new Date(order.created_at).toLocaleString(),
      order.order_type || '-',
      order.payment_method || '-',
      order.total ?? 0,
      order.status ?? 'completed'
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
  const products_data: CellValue[][] = [
    ['Product', 'Quantity Sold', 'Revenue']
  ]

  data.summary.top_products.forEach((product) => {
    products_data.push([
      product.name,
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
function generateAttendanceExcel(data: AttendanceArchiveData, period: PeriodRange): Blob {
  const ws_data: CellValue[][] = [
    ['Staff Attendance Archive'],
    [`Period: ${getArchivePeriodLabel(period)}`],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    ['Staff Name', 'Days Present', 'Late Count', 'Early Leave', 'Total Hours']
  ]

  data.summary.staff_metrics.forEach((s) => {
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
 * Main Archive Function - Generate all archives for a period
 */
async function collectArchiveData(period: PeriodRange, types: ArchiveType[]): Promise<ArchiveData> {
  const archiveData: ArchiveData = {}

  if (types.includes('all') || types.includes('activity_logs')) {
    try {
      console.log('Fetching activity logs...')
      archiveData.activities = await archiveActivityLogs(period.start, period.end)
      console.log('Activity logs fetched:', archiveData.activities?.length || 0)
    } catch (err) {
      console.error('Error fetching activity logs:', err)
      throw new Error(`Failed to fetch activity logs: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (types.includes('all') || types.includes('sales')) {
    try {
      console.log('Fetching sales data...')
      archiveData.sales = await archiveSalesData(period.start, period.end)
      console.log('Sales data fetched:', archiveData.sales?.orders?.length || 0)
    } catch (err) {
      console.error('Error fetching sales data:', err)
      throw new Error(`Failed to fetch sales data: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (types.includes('all') || types.includes('staff_attendance')) {
    try {
      console.log('Fetching staff attendance...')
      archiveData.attendance = await archiveStaffAttendance(period.start, period.end)
      console.log('Attendance fetched:', archiveData.attendance?.attendance?.length || 0)
    } catch (err) {
      console.error('Error fetching attendance:', err)
      throw new Error(`Failed to fetch attendance: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return archiveData
}

function getNormalizedArchiveTypes(types: ArchiveType[]): ArchiveType[] {
  if (types.includes('all')) {
    return ['activity_logs', 'sales', 'staff_attendance']
  }

  return types
}

/**
 * Main Archive Function - Generate all archives for a selected period.
 */
export async function generateArchive(options: ArchiveGenerationOptions = {}): Promise<ArchiveResult> {
  try {
    const types = getNormalizedArchiveTypes(options.types ?? ['activity_logs', 'sales', 'staff_attendance'])
    const format = options.format ?? 'pdf'
    const period = getArchiveRange(options.startDate, options.endDate)

    console.log('Starting archive generation for types:', types)
    console.log('Archive period:', period)

    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const archiveData = await collectArchiveData(period, types)

    console.log('Generating metadata...')
    const metadata = generateMetadata(period, types, archiveData)

    console.log('Checking for existing archive with ID:', metadata.archive_id)
    const { data: existingArchives, error: checkError } = await supabase
      .from('archives')
      .select('archive_id, period_month, period_year, period_start_date, period_end_date, archive_type, deleted_at')
      .eq('archive_id', metadata.archive_id)

    if (checkError) {
      throw checkError
    }

    const checkedArchives = (existingArchives || []) as ExistingArchiveRecord[]

    if (checkedArchives.length > 0) {
      const archive = checkedArchives[0]

      if (!archive.deleted_at) {
        return {
          success: false,
          message: `Archive for ${getArchivePeriodLabel(period)} already exists. Please delete the existing archive first if you want to regenerate it.`,
          archiveId: archive.archive_id
        }
      }
    }

    console.log('Saving archive metadata to database...')
    const { data: archiveRecord, error: archiveError } = await supabase
      .from('archives')
      .upsert({
        archive_id: metadata.archive_id,
        period_month: period.month,
        period_year: period.year,
        period_start_date: period.start,
        period_end_date: period.end,
        archive_type: period.archiveType,
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
        deleted_at: null,
        deleted_by: null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'archive_id'
      })
      .select()
      .single()

    if (archiveError) {
      console.error('Error saving to database:', archiveError)
      throw new Error(`Failed to save archive: ${archiveError.message}`)
    }

    console.log('Archive saved to database:', archiveRecord)

    console.log('Generating files with format:', format)
    const files: ArchiveFiles = {}

    if (archiveData.activities) {
      try {
        console.log('Creating activity logs file...')
        files.activity_logs = format === 'excel'
          ? generateActivityLogExcel(archiveData.activities, period)
          : generateActivityLogPDF(archiveData.activities, period)
      } catch (err) {
        console.error('Error creating activity log file:', err)
        throw new Error(`Failed to create activity log file: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    if (archiveData.sales) {
      try {
        console.log('Creating sales file...')
        files.sales = format === 'excel'
          ? generateSalesExcel(archiveData.sales, period)
          : generateSalesPDF(archiveData.sales, period)
      } catch (err) {
        console.error('Error creating sales file:', err)
        throw new Error(`Failed to create sales file: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    if (archiveData.attendance) {
      try {
        console.log('Creating attendance file...')
        files.attendance = format === 'excel'
          ? generateAttendanceExcel(archiveData.attendance, period)
          : generateAttendancePDF(archiveData.attendance, period)
      } catch (err) {
        console.error('Error creating attendance file:', err)
        throw new Error(`Failed to create attendance file: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    const archiveId = metadata.archive_id
    localStorage.setItem('last_month_archived', archiveId)
    localStorage.setItem('last_archive_check', new Date().toISOString().split('T')[0])

    console.log('Archive generation completed successfully')
    return {
      success: true,
      message: `Successfully archived ${getArchivePeriodLabel(period)} data`,
      files,
      archiveId
    }
  } catch (error: unknown) {
    console.error('Archive generation error (detailed):', error)
    return {
      success: false,
      message: getErrorMessage(error, 'Failed to generate archive. Check console for details.')
    }
  }
}

/**
 * Backward-compatible monthly archive function.
 * Pass a custom date range through the optional third argument.
 */
export async function generateMonthlyArchive(
  types: ArchiveType[] = ['activity_logs', 'sales', 'staff_attendance'],
  format: ArchiveFormat = 'pdf',
  range?: { startDate?: string; endDate?: string }
): Promise<ArchiveResult> {
  return generateArchive({
    types,
    format,
    startDate: range?.startDate,
    endDate: range?.endDate
  })
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
  } catch (error: unknown) {
    return {
      success: false,
      message: getErrorMessage(error, 'Failed to delete archived data')
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
    
    const records = (data || []) as ArchiveDbRecord[]

    return records.map((record) => {
      const periodDates = getArchiveRecordPeriod(record)
      const totalRecords = normalizeTotalRecords(record.total_records)

      return {
        archive_id: record.archive_id,
        generated_at: record.generated_at,
        period: {
          start: periodDates.start,
          end: periodDates.end,
          month: record.period_month,
          year: record.period_year
        },
        archive_type: record.archive_type ?? (record.period_start_date || record.period_end_date ? 'custom_range' : 'monthly'),
        data_types: record.data_types || [],
        total_records: totalRecords,
        key_metrics: record.key_metrics || {},
        generated_by: record.generated_by_staff?.name || 'Unknown',
        version: '1.0'
      }
    })
  } catch (error: unknown) {
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
  } catch (error: unknown) {
    console.error('Error deleting archive:', error)
    return {
      success: false,
      message: getErrorMessage(error, 'Failed to delete archive')
    }
  }
}

/**
 * Download archive file without saving to database
 * Fetches data, generates file, and triggers download
 */
async function resolveArchivePeriodForDownload(archiveId: string): Promise<PeriodRange> {
  const { data, error } = await supabase
    .from('archives')
    .select('archive_id, period_month, period_year, period_start_date, period_end_date, archive_type')
    .eq('archive_id', archiveId)
    .maybeSingle()

  if (!error && data) {
    const record = data as ArchiveDbRecord
    const periodDates = getArchiveRecordPeriod(record)

    return {
      start: periodDates.start,
      end: periodDates.end,
      month: record.period_month,
      year: record.period_year,
      archiveType: record.archive_type === 'monthly' ? 'monthly' : 'custom_range'
    }
  }

  const rangeMatch = archiveId.match(/^archive_(\d{4}-\d{2}-\d{2})_to_(\d{4}-\d{2}-\d{2})$/)
  if (rangeMatch) {
    return buildPeriodRange(rangeMatch[1], rangeMatch[2])
  }

  const monthlyMatch = archiveId.match(/^(\d{4})-(\d{2})$/)
  if (monthlyMatch) {
    const startDate = `${archiveId}-01`
    const endDate = getLastDayOfMonth(startDate)
    return buildPeriodRange(startDate, endDate)
  }

  throw new Error('Unable to resolve archive period')
}

/**
 * Download archived files
 */
export async function downloadArchiveFile(
  archiveId: string, 
  fileType?: string, 
  format: 'pdf' | 'excel' = 'pdf'
): Promise<{ success: boolean, message: string }> {
  try {
    const period = await resolveArchivePeriodForDownload(archiveId)
    const safeArchiveId = archiveId.replace(/[^a-zA-Z0-9_-]/g, '_')

    const filesToDownload = fileType
      ? [fileType]
      : ['activity_logs', 'sales', 'staff_attendance']

    for (const type of filesToDownload) {
      let blob: Blob
      let fileName: string

      if (type === 'activity_logs') {
        const data = await archiveActivityLogs(period.start, period.end)
        if (format === 'excel') {
          blob = generateActivityLogExcel(data, period)
          fileName = `${safeArchiveId}_activity_logs.xlsx`
        } else {
          blob = generateActivityLogPDF(data, period)
          fileName = `${safeArchiveId}_activity_logs.pdf`
        }
      } else if (type === 'sales') {
        const data = await archiveSalesData(period.start, period.end)
        if (format === 'excel') {
          blob = generateSalesExcel(data, period)
          fileName = `${safeArchiveId}_sales.xlsx`
        } else {
          blob = generateSalesPDF(data, period)
          fileName = `${safeArchiveId}_sales.pdf`
        }
      } else if (type === 'staff_attendance') {
        const data = await archiveStaffAttendance(period.start, period.end)
        if (format === 'excel') {
          blob = generateAttendanceExcel(data, period)
          fileName = `${safeArchiveId}_attendance.xlsx`
        } else {
          blob = generateAttendancePDF(data, period)
          fileName = `${safeArchiveId}_attendance.pdf`
        }
      } else {
        continue
      }

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
  } catch (error: unknown) {
    console.error('Error downloading archive:', error)
    return {
      success: false,
      message: getErrorMessage(error, 'Failed to download archive')
    }
  }
}
