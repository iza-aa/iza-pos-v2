import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { supabase } from "@/lib/config/supabaseClient";

interface GenerateQRBody {
  table_id?: string;
  table_number?: string;
}

interface GenerateQRSuccessResponse {
  success: true;
  message: string;
  data: {
    id: string;
    table_number: string;
    qr_code_url: string | null;
    qr_code_image: string | null;
    qr_generated_at: string | null;
  };
}

interface GenerateQRErrorResponse {
  success: false;
  message: string;
}

type GenerateQRResponse = GenerateQRSuccessResponse | GenerateQRErrorResponse;

function createErrorResponse(message: string, status: number) {
  const response: GenerateQRResponse = {
    success: false,
    message,
  };

  return NextResponse.json(response, { status });
}

function getAppUrl(): string {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  return appUrl.replace(/\/$/, "");
}

function createCustomerTableUrl(tableId: string): string {
  return `${getAppUrl()}/customer/table/${encodeURIComponent(tableId)}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateQRBody;

    const tableId = body.table_id?.trim();
    const tableNumber = body.table_number?.trim();

    if (!tableId) {
      return createErrorResponse("Table ID is required.", 400);
    }

    if (!tableNumber) {
      return createErrorResponse("Table number is required.", 400);
    }

    const customerUrl = createCustomerTableUrl(tableId);

    const qrCodeImage = await QRCode.toDataURL(customerUrl, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: "H",
    });

    const { data, error } = await supabase
      .from("tables")
      .update({
        qr_code_url: customerUrl,
        qr_code_image: qrCodeImage,
        qr_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", tableId)
      .select("id, table_number, qr_code_url, qr_code_image, qr_generated_at")
      .single();

    if (error) {
      return createErrorResponse(error.message, 500);
    }

    if (!data) {
      return createErrorResponse("Failed to generate QR code.", 500);
    }

    const response: GenerateQRResponse = {
      success: true,
      message: "QR code generated successfully.",
      data,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate QR code.";

    return createErrorResponse(message, 500);
  }
}