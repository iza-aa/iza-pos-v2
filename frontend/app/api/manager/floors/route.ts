/**
 * API Route: Manager Floors
 * Handles floor CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFloors, getFloorsWithTables, createFloor } from '@/lib/services/table';
import type { FloorCreateInput } from '@/lib/types/floor';

/**
 * GET /api/manager/floors
 * Get all floors with optional table counts
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const with_tables = searchParams.get('with_tables') === 'true';

    const floors = with_tables ? await getFloorsWithTables() : await getFloors();

    return NextResponse.json({
      success: true,
      data: floors,
      count: floors.length,
    });
  } catch (error) {
    console.error('Error fetching floors:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch floors',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/manager/floors
 * Create a new floor
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input: FloorCreateInput = {
      name: body.name,
      floor_number: body.floor_number,
      is_active: body.is_active ?? true,
    };

    // Validate required fields
    if (!input.name || input.floor_number === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, floor_number',
        },
        { status: 400 }
      );
    }

    const floor = await createFloor(input);

    return NextResponse.json({
      success: true,
      data: floor,
      message: 'Floor created successfully',
    });
  } catch (error) {
    console.error('Error creating floor:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create floor',
      },
      { status: 500 }
    );
  }
}
