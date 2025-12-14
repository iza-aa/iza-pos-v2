/**
 * API Route: Manager Tables (Single)
 * Handles individual table operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTableById, updateTable, deleteTable } from '@/lib/services/table';
import type { TableUpdateInput } from '@/lib/types/table';

/**
 * GET /api/manager/tables/[id]
 * Get a single table by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const table = await getTableById(params.id);

    if (!table) {
      return NextResponse.json(
        {
          success: false,
          error: 'Table not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: table,
    });
  } catch (error) {
    console.error('Error fetching table:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch table',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/manager/tables/[id]
 * Update a table
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const input: TableUpdateInput = {};

    // Only update provided fields
    if (body.table_number !== undefined) input.table_number = body.table_number;
    if (body.floor_id !== undefined) input.floor_id = body.floor_id;
    if (body.capacity !== undefined) input.capacity = body.capacity;
    if (body.shape !== undefined) input.shape = body.shape;
    if (body.position_x !== undefined) input.position_x = body.position_x;
    if (body.position_y !== undefined) input.position_y = body.position_y;
    if (body.status !== undefined) input.status = body.status;
    if (body.is_active !== undefined) input.is_active = body.is_active;
    if (body.notes !== undefined) input.notes = body.notes;

    const table = await updateTable(params.id, input);

    return NextResponse.json({
      success: true,
      data: table,
      message: 'Table updated successfully',
    });
  } catch (error) {
    console.error('Error updating table:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update table',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/manager/tables/[id]
 * Delete a table
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteTable(params.id);

    return NextResponse.json({
      success: true,
      message: 'Table deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting table:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete table',
      },
      { status: 500 }
    );
  }
}
