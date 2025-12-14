/**
 * Archive Types
 * Type definitions for archive system
 */

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

export interface PeriodRange {
  start: string
  end: string
  month: string
  year: string
}
