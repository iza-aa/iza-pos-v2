/**
 * Customer API: Validate Table
 * Check if table number is valid and available
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTableByNumber } from '@/lib/services/table';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tableNumber = searchParams.get('table_number');

    if (!tableNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'Table number is required',
        },
        { status: 400 }
      );
    }

    const table = await getTableByNumber(tableNumber);

    if (!table) {
      return NextResponse.json(
        {
          success: false,
          error: 'Table not found',
        },
        { status: 404 }
      );
    }

    if (!table.is_active) {
      return NextResponse.json(
        {
          success: false,
          error: 'This table is currently unavailable',
        },
        { status: 400 }
      );
    }

    // Return table info (without sensitive data)
    return NextResponse.json({
      success: true,
      data: {
        id: table.id,
        table_number: table.table_number,
        floor_name: table.floor_name,
        capacity: table.capacity,
        status: table.status,
      },
    });
  } catch (error) {
    console.error('Error validating table:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to validate table',
      },
      { status: 500 }
    );
  }
}
