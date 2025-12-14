/**
 * Floor Types
 * TypeScript types for restaurant floor management
 */

// Floor Interface
export interface Floor {
  id: string;
  name: string;
  floor_number: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Floor with table count
export interface FloorWithTables extends Floor {
  table_count: number;
  active_tables: number;
  occupied_tables: number;
}

// Floor Create Input
export interface FloorCreateInput {
  name: string;
  floor_number: number;
  is_active?: boolean;
}

// Floor Update Input
export interface FloorUpdateInput {
  name?: string;
  floor_number?: number;
  is_active?: boolean;
}

// Floor with full details (including tables)
export interface FloorDetails extends Floor {
  tables: Array<{
    id: string;
    table_number: string;
    status: string;
    capacity: number;
  }>;
}

// Validation
export const FLOOR_CONSTRAINTS = {
  MIN_FLOOR_NUMBER: -2, // Basement levels
  MAX_FLOOR_NUMBER: 50,
  MAX_NAME_LENGTH: 50,
} as const;
