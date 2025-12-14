/**
 * API Route: Regenerate QR Code
 * Handles QR code regeneration (deletes old, creates new)
 */

import { NextRequest, NextResponse } from 'next/server';
import { regenerateTableQR } from '@/lib/services/table';

/**
 * POST /api/manager/qr/regenerate
 * Regenerate QR code for a table
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { table_id, table_number } = body;

    if (!table_id || !table_number) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: table_id, table_number',
        },
        { status: 400 }
      );
    }

    const table = await regenerateTableQR(table_id, table_number);

    return NextResponse.json({
      success: true,
      data: table,
      message: 'QR code regenerated successfully',
    });
  } catch (error) {
    console.error('Error regenerating QR code:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to regenerate QR code',
      },
      { status: 500 }
    );
  }
}
