/**
 * API Route: Update Table Status
 * Handles table status updates (free, occupied, reserved, cleaning)
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateTableStatus, getTableOccupancyStats, getFloorOccupancyStats } from '@/lib/services/table';
import type { TableStatus } from '@/lib/types/table';

/**
 * PATCH /api/manager/tables/status
 * Update table status
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { table_id, status } = body;

    if (!table_id || !status) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: table_id, status',
        },
        { status: 400 }
      );
    }

    await updateTableStatus(table_id, status as TableStatus);

    return NextResponse.json({
      success: true,
      message: 'Table status updated successfully',
    });
  } catch (error) {
    console.error('Error updating table status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update status',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/manager/tables/status
 * Get table occupancy statistics
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const floor_id = searchParams.get('floor_id');

    const stats = floor_id 
      ? await getFloorOccupancyStats(floor_id)
      : await getTableOccupancyStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching occupancy stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch stats',
      },
      { status: 500 }
    );
  }
}
