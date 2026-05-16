import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { supabase } from '@/lib/config/supabaseClient';

interface GenerateQRBody {
  table_id?: string;
  table_number?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateQRBody;

    const tableId = body.table_id?.trim();
    const tableNumber = body.table_number?.trim();

    if (!tableId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Table ID is required.',
        },
        { status: 400 }
      );
    }

    if (!tableNumber) {
      return NextResponse.json(
        {
          success: false,
          message: 'Table number is required.',
        },
        { status: 400 }
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000';

    const customerUrl = `${appUrl}/menu?table_id=${encodeURIComponent(
      tableId
    )}`;

    const qrCodeImage = await QRCode.toDataURL(customerUrl, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'H',
    });

    const { data, error } = await supabase
      .from('tables')
      .update({
        qr_code_url: customerUrl,
        qr_code_image: qrCodeImage,
        qr_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', tableId)
      .select(
        'id, table_number, qr_code_url, qr_code_image, qr_generated_at'
      )
      .single();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'QR code generated successfully.',
      data,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to generate QR code.';

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}