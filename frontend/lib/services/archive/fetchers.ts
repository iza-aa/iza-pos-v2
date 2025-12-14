/**
 * Archive Data Fetchers
 * Functions to fetch and aggregate data for archiving
 */

import { supabase } from '@/lib/config/supabaseClient'

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
    return {
      attendance: [],
      summary: {
        total_records: 0,
        staff_metrics: []
      }
    }
  }
}
