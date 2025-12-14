/**
 * API Route: Manager Tables
 * Handles table CRUD operations for managers
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTables, createTable, getTablesWithoutQR } from '@/lib/services/table';
import type { TableCreateInput } from '@/lib/types/table';

/**
 * GET /api/manager/tables
 * Get all tables with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const floor_id = searchParams.get('floor_id') || undefined;
    const status = searchParams.get('status') as any;
    const is_active = searchParams.get('is_active');
    const without_qr = searchParams.get('without_qr') === 'true';

    // Get tables based on filters
    let tables;
    if (without_qr) {
      tables = await getTablesWithoutQR(floor_id);
    } else {
      tables = await getTables({
        floor_id,
        status,
        is_active: is_active ? is_active === 'true' : undefined,
      });
    }

    return NextResponse.json({
      success: true,
      data: tables,
      count: tables.length,
    });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch tables',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/manager/tables
 * Create a new table
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input: TableCreateInput = {
      table_number: body.table_number,
      floor_id: body.floor_id,
      capacity: body.capacity,
      shape: body.shape || 'round',
      position_x: body.position_x || 0,
      position_y: body.position_y || 0,
      notes: body.notes || null,
    };

    // Validate required fields
    if (!input.table_number || !input.floor_id || !input.capacity) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: table_number, floor_id, capacity',
        },
        { status: 400 }
      );
    }

    const table = await createTable(input);

    return NextResponse.json({
      success: true,
      data: table,
      message: 'Table created successfully',
    });
  } catch (error) {
    console.error('Error creating table:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create table',
      },
      { status: 500 }
    );
  }
}
