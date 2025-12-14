/**
 * API Route: Manager Floors (Single)
 * Handles individual floor operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFloorById, updateFloor, deleteFloor, toggleFloorStatus } from '@/lib/services/table';
import type { FloorUpdateInput } from '@/lib/types/floor';

/**
 * GET /api/manager/floors/[id]
 * Get a single floor by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const floor = await getFloorById(params.id);

    if (!floor) {
      return NextResponse.json(
        {
          success: false,
          error: 'Floor not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: floor,
    });
  } catch (error) {
    console.error('Error fetching floor:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch floor',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/manager/floors/[id]
 * Update a floor
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const input: FloorUpdateInput = {};

    // Only update provided fields
    if (body.name !== undefined) input.name = body.name;
    if (body.floor_number !== undefined) input.floor_number = body.floor_number;
    if (body.is_active !== undefined) input.is_active = body.is_active;

    const floor = await updateFloor(params.id, input);

    return NextResponse.json({
      success: true,
      data: floor,
      message: 'Floor updated successfully',
    });
  } catch (error) {
    console.error('Error updating floor:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update floor',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/manager/floors/[id]
 * Delete a floor (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteFloor(params.id);

    return NextResponse.json({
      success: true,
      message: 'Floor deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting floor:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete floor',
      },
      { status: 500 }
    );
  }
}
