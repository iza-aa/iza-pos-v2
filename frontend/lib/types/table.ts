/**
 * Table Types
 * TypeScript types for restaurant table management
 */

// Table Status
export type TableStatus = 'free' | 'occupied' | 'reserved' | 'cleaning';

// Table Shape
export type TableShape = 'round' | 'square' | 'rectangular';

// Table Interface
export interface Table {
  id: string;
  table_number: string;
  floor_id: string;
  
  // Properties
  capacity: number;
  shape: TableShape;
  status: TableStatus;
  
  // QR Code
  qr_code_url: string | null;
  qr_code_image: string | null;
  qr_generated_at: string | null;
  
  // Position
  position_x: number;
  position_y: number;
  
  // Current session
  current_order_id: string | null;
  occupied_at: string | null;
  occupied_by_customer: string | null;
  
  // Metadata
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Relations (optional, populated with joins)
  floor?: Floor;
  current_order?: any; // Import Order type if needed
}

// Table with Floor Name (for display)
export interface TableWithFloor extends Table {
  floor_name: string;
}

// Table Create Input
export interface TableCreateInput {
  table_number: string;
  floor_id: string;
  capacity: number;
  shape: TableShape;
  position_x?: number;
  position_y?: number;
  notes?: string;
}

// Table Update Input
export interface TableUpdateInput {
  table_number?: string;
  floor_id?: string;
  capacity?: number;
  shape?: TableShape;
  status?: TableStatus;
  position_x?: number;
  position_y?: number;
  notes?: string;
  is_active?: boolean;
}

// Table Status Update
export interface TableStatusUpdate {
  status: TableStatus;
  occupied_by_customer?: string;
}

// QR Code Data
export interface TableQRCode {
  table_id: string;
  table_number: string;
  qr_code_url: string;
  qr_code_image: string;
}

// Table for Manager View (with additional info)
export interface TableManagerView extends Table {
  floor_name: string;
  order_count: number;
  last_occupied_at: string | null;
  total_revenue_today: number;
}

// Floor Interface (imported from floor.ts but defined here for reference)
export interface Floor {
  id: string;
  name: string;
  floor_number: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Table Session (for analytics)
export interface TableSession {
  id: string;
  table_id: string;
  customer_count: number | null;
  customer_name: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  order_ids: string[];
  total_orders: number;
  total_revenue: number;
  notes: string | null;
  created_at: string;
}

// Analytics Types
export interface TableTurnoverRate {
  table_id: string;
  table_number: string;
  sessions_count: number;
  avg_duration_minutes: number;
  total_revenue: number;
  avg_revenue_per_session: number;
}

export interface TablePeakHours {
  hour_of_day: number;
  sessions_started: number;
  total_customers: number;
  total_revenue: number;
}

// Table Validation
export const TABLE_CONSTRAINTS = {
  MIN_CAPACITY: 1,
  MAX_CAPACITY: 20,
  MAX_TABLE_NUMBER_LENGTH: 10,
  VALID_STATUSES: ['free', 'occupied', 'reserved', 'cleaning'] as const,
  VALID_SHAPES: ['round', 'square', 'rectangular'] as const,
} as const;

// Type Guards
export function isValidTableStatus(status: string): status is TableStatus {
  return TABLE_CONSTRAINTS.VALID_STATUSES.includes(status as TableStatus);
}

export function isValidTableShape(shape: string): shape is TableShape {
  return TABLE_CONSTRAINTS.VALID_SHAPES.includes(shape as TableShape);
}

// Helper type for table filtering
export interface TableFilters {
  floor_id?: string;
  status?: TableStatus;
  is_active?: boolean;
  has_qr?: boolean;
}
