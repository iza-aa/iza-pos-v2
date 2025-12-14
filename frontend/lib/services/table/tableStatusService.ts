/**
 * Table Status Service
 * Handles table status updates and real-time subscriptions
 */

import { createClient } from '@/lib/supabase/client';
import type { TableStatus } from '@/lib/types/table';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Update table status
 */
export async function updateTableStatus(
  tableId: string, 
  status: TableStatus
): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('tables')
    .update({ status })
    .eq('id', tableId);
  
  if (error) {
    console.error('Error updating table status:', error);
    throw new Error(`Failed to update table status: ${error.message}`);
  }
}

/**
 * Update table status by table number
 */
export async function updateTableStatusByNumber(
  tableNumber: string, 
  status: TableStatus
): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('tables')
    .update({ status })
    .eq('table_number', tableNumber);
  
  if (error) {
    console.error('Error updating table status by number:', error);
    throw new Error(`Failed to update table status: ${error.message}`);
  }
}

/**
 * Mark table as occupied
 */
export async function occupyTable(tableId: string): Promise<void> {
  return updateTableStatus(tableId, 'occupied');
}

/**
 * Mark table as free
 */
export async function freeTable(tableId: string): Promise<void> {
  return updateTableStatus(tableId, 'free');
}

/**
 * Mark table as reserved
 */
export async function reserveTable(tableId: string): Promise<void> {
  return updateTableStatus(tableId, 'reserved');
}

/**
 * Mark table as cleaning
 */
export async function markTableCleaning(tableId: string): Promise<void> {
  return updateTableStatus(tableId, 'cleaning');
}

/**
 * Batch update table statuses
 */
export async function batchUpdateTableStatus(
  updates: Array<{ id: string; status: TableStatus }>
): Promise<{ success: number; failed: number }> {
  const results = {
    success: 0,
    failed: 0,
  };
  
  for (const update of updates) {
    try {
      await updateTableStatus(update.id, update.status);
      results.success++;
    } catch (error) {
      console.error(`Failed to update table ${update.id}:`, error);
      results.failed++;
    }
  }
  
  return results;
}

/**
 * Subscribe to table status changes
 */
export function subscribeToTableStatus(
  tableId: string,
  callback: (status: TableStatus) => void
): RealtimeChannel {
  const supabase = createClient();
  
  const channel = supabase
    .channel(`table-${tableId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'tables',
        filter: `id=eq.${tableId}`,
      },
      (payload) => {
        if (payload.new && 'status' in payload.new) {
          callback(payload.new.status as TableStatus);
        }
      }
    )
    .subscribe();
  
  return channel;
}

/**
 * Subscribe to all table status changes on a floor
 */
export function subscribeToFloorTables(
  floorId: string,
  callback: (table: any) => void
): RealtimeChannel {
  const supabase = createClient();
  
  const channel = supabase
    .channel(`floor-${floorId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tables',
        filter: `floor_id=eq.${floorId}`,
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();
  
  return channel;
}

/**
 * Subscribe to all table changes
 */
export function subscribeToAllTables(
  callback: (payload: any) => void
): RealtimeChannel {
  const supabase = createClient();
  
  const channel = supabase
    .channel('all-tables')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tables',
      },
      callback
    )
    .subscribe();
  
  return channel;
}

/**
 * Unsubscribe from real-time channel
 */
export async function unsubscribe(channel: RealtimeChannel): Promise<void> {
  await channel.unsubscribe();
}

/**
 * Get current table status
 */
export async function getTableStatus(tableId: string): Promise<TableStatus | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('tables')
    .select('status')
    .eq('id', tableId)
    .single();
  
  if (error) {
    console.error('Error fetching table status:', error);
    return null;
  }
  
  return data?.status || null;
}

/**
 * Get table status by table number
 */
export async function getTableStatusByNumber(
  tableNumber: string
): Promise<TableStatus | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('tables')
    .select('status')
    .eq('table_number', tableNumber)
    .single();
  
  if (error) {
    console.error('Error fetching table status by number:', error);
    return null;
  }
  
  return data?.status || null;
}

/**
 * Check if table is available
 */
export async function isTableAvailable(tableId: string): Promise<boolean> {
  const status = await getTableStatus(tableId);
  return status === 'free';
}

/**
 * Check if table is occupied
 */
export async function isTableOccupied(tableId: string): Promise<boolean> {
  const status = await getTableStatus(tableId);
  return status === 'occupied';
}

/**
 * Get table occupancy statistics
 */
export async function getTableOccupancyStats() {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('tables')
    .select('status, is_active');
  
  if (error) {
    console.error('Error fetching table stats:', error);
    throw new Error(`Failed to fetch table stats: ${error.message}`);
  }
  
  const activeTables = data?.filter((t: any) => t.is_active) || [];
  
  return {
    total: activeTables.length,
    free: activeTables.filter((t: any) => t.status === 'free').length,
    occupied: activeTables.filter((t: any) => t.status === 'occupied').length,
    reserved: activeTables.filter((t: any) => t.status === 'reserved').length,
    cleaning: activeTables.filter((t: any) => t.status === 'cleaning').length,
    occupancy_rate: activeTables.length > 0 
      ? Math.round((activeTables.filter((t: any) => t.status === 'occupied').length / activeTables.length) * 100)
      : 0,
  };
}

/**
 * Get floor occupancy statistics
 */
export async function getFloorOccupancyStats(floorId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('tables')
    .select('status, is_active')
    .eq('floor_id', floorId);
  
  if (error) {
    console.error('Error fetching floor stats:', error);
    throw new Error(`Failed to fetch floor stats: ${error.message}`);
  }
  
  const activeTables = data?.filter((t: any) => t.is_active) || [];
  
  return {
    total: activeTables.length,
    free: activeTables.filter((t: any) => t.status === 'free').length,
    occupied: activeTables.filter((t: any) => t.status === 'occupied').length,
    reserved: activeTables.filter((t: any) => t.status === 'reserved').length,
    cleaning: activeTables.filter((t: any) => t.status === 'cleaning').length,
    occupancy_rate: activeTables.length > 0 
      ? Math.round((activeTables.filter((t: any) => t.status === 'occupied').length / activeTables.length) * 100)
      : 0,
  };
}
