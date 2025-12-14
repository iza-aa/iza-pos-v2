import { supabase } from './supabaseClient'
import { getCurrentUser } from './authUtils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Archive types
export type ArchiveType = 'activity_logs' | 'sales' | 'staff_attendance' | 'all'

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
 * Main Archive Function - Generate all archives for a period
 */
export async function generateMonthlyArchive(
  types: ArchiveType[] = ['activity_logs', 'sales', 'staff_attendance']
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
    
    // Save to database first
    console.log('Saving archive metadata to database...')
    const { data: archiveRecord, error: archiveError } = await supabase
      .from('archives')
      .insert({
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
        }
      })
      .select()
      .single()
    
    if (archiveError) {
      console.error('Error saving to database:', archiveError)
      throw new Error(`Failed to save archive: ${archiveError.message}`)
    }
    
    console.log('Archive saved to database:', archiveRecord)
    
    // Generate files
    console.log('Generating files...')
    const files: any = {
      metadata: new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' })
    }
    
    if (archiveData.activities) {
      try {
        console.log('Creating activity logs files...')
        files.activity_logs_json = new Blob([JSON.stringify(archiveData.activities, null, 2)], { type: 'application/json' })
        files.activity_logs_pdf = generateActivityLogPDF(archiveData.activities, period)
      } catch (err) {
        console.error('Error creating activity log files:', err)
        throw new Error(`Failed to create activity log files: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    
    if (archiveData.sales) {
      try {
        console.log('Creating sales files...')
        files.sales_json = new Blob([JSON.stringify(archiveData.sales, null, 2)], { type: 'application/json' })
        files.sales_pdf = generateSalesPDF(archiveData.sales, period)
      } catch (err) {
        console.error('Error creating sales files:', err)
        throw new Error(`Failed to create sales files: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    
    if (archiveData.attendance) {
      try {
        console.log('Creating attendance files...')
        files.attendance_json = new Blob([JSON.stringify(archiveData.attendance, null, 2)], { type: 'application/json' })
        files.attendance_pdf = generateAttendancePDF(archiveData.attendance, period)
      } catch (err) {
        console.error('Error creating attendance files:', err)
        throw new Error(`Failed to create attendance files: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    
    // Download all files
    console.log('Downloading files...')
    const archiveId = metadata.archive_id
    Object.entries(files).forEach(([name, blob]: [string, any]) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const ext = name.includes('json') ? 'json' : 'pdf'
      link.download = `${archiveId}_${name}.${ext}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    })
    
    // Mark as archived
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
