/**
 * API Route: Delete QR Code
 * Handles QR code deletion from storage and table
 */

import { NextRequest, NextResponse } from 'next/server';
import { deleteTableQR } from '@/lib/services/table';

/**
 * POST /api/manager/qr/delete
 * Delete QR code for a table
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { table_id } = body;

    if (!table_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: table_id',
        },
        { status: 400 }
      );
    }

    await deleteTableQR(table_id);

    return NextResponse.json({
      success: true,
      message: 'QR code deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting QR code:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete QR code',
      },
      { status: 500 }
    );
  }
}
