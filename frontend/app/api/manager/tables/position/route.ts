/**
 * API Route: Update Table Position
 * Handles drag & drop position updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateTablePosition } from '@/lib/services/table';

/**
 * PATCH /api/manager/tables/position
 * Update table position (for drag & drop)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, position_x, position_y } = body;

    if (!id || position_x === undefined || position_y === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: id, position_x, position_y',
        },
        { status: 400 }
      );
    }

    await updateTablePosition(id, position_x, position_y);

    return NextResponse.json({
      success: true,
      message: 'Table position updated successfully',
    });
  } catch (error) {
    console.error('Error updating table position:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update position',
      },
      { status: 500 }
    );
  }
}
