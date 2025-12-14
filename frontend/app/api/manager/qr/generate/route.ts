/**
 * API Route: Generate QR Codes
 * Handles QR code generation for tables
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAndSaveTableQR, generateBulkTableQR } from '@/lib/services/table';

/**
 * POST /api/manager/qr/generate
 * Generate QR code for single or multiple tables
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Bulk generation
    if (body.tables && Array.isArray(body.tables)) {
      const results = await generateBulkTableQR(body.tables);
      
      return NextResponse.json({
        success: true,
        data: results,
        message: `Generated ${results.success} QR codes, ${results.failed} failed`,
      });
    }
    
    // Single table generation
    if (body.table_id && body.table_number) {
      const table = await generateAndSaveTableQR(body.table_id, body.table_number);
      
      return NextResponse.json({
        success: true,
        data: table,
        message: 'QR code generated successfully',
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request. Provide either table_id & table_number, or tables array',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error generating QR code:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate QR code',
      },
      { status: 500 }
    );
  }
}
