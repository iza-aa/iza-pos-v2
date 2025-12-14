/**
 * PDF Generators
 * Generate PDF documents for archive files
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PeriodRange } from '@/lib/types/archive'

/**
 * Generate Activity Log PDF
 */
export function generateActivityLogPDF(data: any[], period: PeriodRange): Blob {
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
export function generateSalesPDF(data: any, period: PeriodRange): Blob {
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
export function generateAttendancePDF(data: any, period: PeriodRange): Blob {
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
