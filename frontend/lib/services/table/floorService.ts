/**
 * Floor Service
 * Handles all floor-related operations
 */

import { createClient } from '@/lib/supabase/client';
import type { Floor, FloorCreateInput, FloorUpdateInput, FloorWithTables } from '@/lib/types/floor';

/**
 * Get all floors
 */
export async function getFloors(): Promise<Floor[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('floors')
    .select('*')
    .order('floor_number', { ascending: true });
  
  if (error) {
    console.error('Error fetching floors:', error);
    throw new Error(`Failed to fetch floors: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Get active floors only
 */
export async function getActiveFloors(): Promise<Floor[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('floors')
    .select('*')
    .eq('is_active', true)
    .order('floor_number', { ascending: true });
  
  if (error) {
    console.error('Error fetching active floors:', error);
    throw new Error(`Failed to fetch active floors: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Get floors with table counts
 */
export async function getFloorsWithTables(): Promise<FloorWithTables[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('floors')
    .select(`
      *,
      tables(id, status)
    `)
    .order('floor_number', { ascending: true });
  
  if (error) {
    console.error('Error fetching floors with tables:', error);
    throw new Error(`Failed to fetch floors with tables: ${error.message}`);
  }
  
  // Transform data to include counts
  return (data || []).map((floor: any) => {
    const tables = floor.tables || [];
    return {
      ...floor,
      total_tables: tables.length,
      available_tables: tables.filter((t: any) => t.status === 'free').length,
      occupied_tables: tables.filter((t: any) => t.status === 'occupied').length,
      reserved_tables: tables.filter((t: any) => t.status === 'reserved').length,
    };
  });
}

/**
 * Get a single floor by ID
 */
export async function getFloorById(id: string): Promise<Floor | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('floors')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching floor:', error);
    return null;
  }
  
  return data;
}

/**
 * Get floor by floor number
 */
export async function getFloorByNumber(floorNumber: number): Promise<Floor | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('floors')
    .select('*')
    .eq('floor_number', floorNumber)
    .single();
  
  if (error) {
    console.error('Error fetching floor by number:', error);
    return null;
  }
  
  return data;
}

/**
 * Create a new floor
 */
export async function createFloor(input: FloorCreateInput): Promise<Floor> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('floors')
    .insert({
      name: input.name,
      floor_number: input.floor_number,
      is_active: input.is_active ?? true,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating floor:', error);
    throw new Error(`Failed to create floor: ${error.message}`);
  }
  
  return data;
}

/**
 * Update an existing floor
 */
export async function updateFloor(id: string, input: FloorUpdateInput): Promise<Floor> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('floors')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating floor:', error);
    throw new Error(`Failed to update floor: ${error.message}`);
  }
  
  return data;
}

/**
 * Delete a floor (soft delete by setting is_active = false)
 */
export async function deleteFloor(id: string): Promise<void> {
  const supabase = createClient();
  
  // Check if floor has tables
  const { data: tables } = await supabase
    .from('tables')
    .select('id')
    .eq('floor_id', id);
  
  if (tables && tables.length > 0) {
    throw new Error('Cannot delete floor with existing tables');
  }
  
  // Perform soft delete
  const { error } = await supabase
    .from('floors')
    .update({ is_active: false })
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting floor:', error);
    throw new Error(`Failed to delete floor: ${error.message}`);
  }
}

/**
 * Hard delete a floor (use with caution)
 */
export async function hardDeleteFloor(id: string): Promise<void> {
  const supabase = createClient();
  
  // Check if floor has tables
  const { data: tables } = await supabase
    .from('tables')
    .select('id')
    .eq('floor_id', id);
  
  if (tables && tables.length > 0) {
    throw new Error('Cannot delete floor with existing tables');
  }
  
  const { error } = await supabase
    .from('floors')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error hard deleting floor:', error);
    throw new Error(`Failed to hard delete floor: ${error.message}`);
  }
}

/**
 * Toggle floor active status
 */
export async function toggleFloorStatus(id: string): Promise<Floor> {
  const supabase = createClient();
  
  // Get current status
  const floor = await getFloorById(id);
  if (!floor) {
    throw new Error('Floor not found');
  }
  
  // Toggle status
  const { data, error } = await supabase
    .from('floors')
    .update({ is_active: !floor.is_active })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error toggling floor status:', error);
    throw new Error(`Failed to toggle floor status: ${error.message}`);
  }
  
  return data;
}

/**
 * Check if floor number already exists
 */
export async function floorNumberExists(floorNumber: number, excludeId?: string): Promise<boolean> {
  const supabase = createClient();
  
  let query = supabase
    .from('floors')
    .select('id')
    .eq('floor_number', floorNumber);
  
  if (excludeId) {
    query = query.neq('id', excludeId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error checking floor number:', error);
    return false;
  }
  
  return (data?.length || 0) > 0;
}
