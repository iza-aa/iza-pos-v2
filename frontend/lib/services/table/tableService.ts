/**
 * Table Service
 * Handles all table-related operations
 */

import { createClient } from '@/lib/supabase/client';
import type { 
  Table, 
  TableCreateInput, 
  TableUpdateInput, 
  TableFilters,
  TableWithFloor 
} from '@/lib/types/table';

/**
 * Get all tables with optional filters
 */
export async function getTables(filters?: TableFilters): Promise<TableWithFloor[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('tables')
    .select(`
      *,
      floor:floors(id, name, floor_number)
    `)
    .order('table_number', { ascending: true });
  
  // Apply filters
  if (filters?.floor_id) {
    query = query.eq('floor_id', filters.floor_id);
  }
  
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  
  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }
  
  if (filters?.has_qr) {
    query = query.not('qr_code_url', 'is', null);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching tables:', error);
    throw new Error(`Failed to fetch tables: ${error.message}`);
  }
  
  // Transform data to include floor_name
  return (data || []).map((table: any) => ({
    ...table,
    floor_name: table.floor?.name || 'Unknown'
  }));
}

/**
 * Get a single table by ID
 */
export async function getTableById(id: string): Promise<TableWithFloor | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('tables')
    .select(`
      *,
      floor:floors(id, name, floor_number)
    `)
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching table:', error);
    return null;
  }
  
  return {
    ...data,
    floor_name: data.floor?.name || 'Unknown'
  };
}

/**
 * Get table by table number
 */
export async function getTableByNumber(tableNumber: string): Promise<TableWithFloor | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('tables')
    .select(`
      *,
      floor:floors(id, name, floor_number)
    `)
    .eq('table_number', tableNumber)
    .single();
  
  if (error) {
    console.error('Error fetching table by number:', error);
    return null;
  }
  
  return {
    ...data,
    floor_name: data.floor?.name || 'Unknown'
  };
}

/**
 * Create a new table
 */
export async function createTable(input: TableCreateInput): Promise<Table> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('tables')
    .insert({
      table_number: input.table_number,
      floor_id: input.floor_id,
      capacity: input.capacity,
      shape: input.shape,
      position_x: input.position_x || 0,
      position_y: input.position_y || 0,
      notes: input.notes || null,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating table:', error);
    throw new Error(`Failed to create table: ${error.message}`);
  }
  
  return data;
}

/**
 * Update an existing table
 */
export async function updateTable(id: string, input: TableUpdateInput): Promise<Table> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('tables')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating table:', error);
    throw new Error(`Failed to update table: ${error.message}`);
  }
  
  return data;
}

/**
 * Delete a table
 */
export async function deleteTable(id: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('tables')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting table:', error);
    throw new Error(`Failed to delete table: ${error.message}`);
  }
}

/**
 * Update table position (for drag & drop)
 */
export async function updateTablePosition(
  id: string, 
  position_x: number, 
  position_y: number
): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('tables')
    .update({ position_x, position_y })
    .eq('id', id);
  
  if (error) {
    console.error('Error updating table position:', error);
    throw new Error(`Failed to update table position: ${error.message}`);
  }
}

/**
 * Get available (free) tables
 */
export async function getAvailableTables(floor_id?: string): Promise<TableWithFloor[]> {
  return getTables({
    status: 'free',
    is_active: true,
    floor_id
  });
}

/**
 * Get occupied tables
 */
export async function getOccupiedTables(floor_id?: string): Promise<TableWithFloor[]> {
  return getTables({
    status: 'occupied',
    is_active: true,
    floor_id
  });
}

/**
 * Check if table number already exists
 */
export async function tableNumberExists(tableNumber: string, excludeId?: string): Promise<boolean> {
  const supabase = createClient();
  
  let query = supabase
    .from('tables')
    .select('id')
    .eq('table_number', tableNumber);
  
  if (excludeId) {
    query = query.neq('id', excludeId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error checking table number:', error);
    return false;
  }
  
  return (data?.length || 0) > 0;
}

/**
 * Get tables without QR codes
 */
export async function getTablesWithoutQR(floor_id?: string): Promise<TableWithFloor[]> {
  const supabase = createClient();
  
  let query = supabase
    .from('tables')
    .select(`
      *,
      floor:floors(id, name, floor_number)
    `)
    .is('qr_code_url', null)
    .eq('is_active', true)
    .order('table_number');
  
  if (floor_id) {
    query = query.eq('floor_id', floor_id);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching tables without QR:', error);
    throw new Error(`Failed to fetch tables without QR: ${error.message}`);
  }
  
  return (data || []).map(table => ({
    ...table,
    floor_name: table.floor?.name || 'Unknown'
  }));
}
