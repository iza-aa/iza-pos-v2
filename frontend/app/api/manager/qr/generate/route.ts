import { NextRequest, NextResponse } from "next/server";
import {
  INTERNAL_SESSION_COOKIE,
  verifyInternalSessionToken,
} from "@/lib/auth/internalSession";
import { generateAndSaveTableQR } from "@/lib/services/table/qrCodeService";

type GenerateQRBody = {
  table_id?: unknown;
  table_number?: unknown;
};

function createErrorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function POST(request: NextRequest) {
  const session = await verifyInternalSessionToken(
    request.cookies.get(INTERNAL_SESSION_COOKIE)?.value,
  ).catch(() => null);

  if (!session || (session.role !== "manager" && session.role !== "owner")) {
    return createErrorResponse("Unauthorized.", 401);
  }

  try {
    const body = (await request.json()) as GenerateQRBody;
    const tableId = typeof body.table_id === "string" ? body.table_id.trim() : "";
    const tableNumber =
      typeof body.table_number === "string" ? body.table_number.trim() : "";

    if (!tableId || !tableNumber) {
      return createErrorResponse("Table ID and table number are required.", 400);
    }

    const table = await generateAndSaveTableQR(tableId, tableNumber);

    return NextResponse.json({
      success: true,
      message: "QR code generated successfully.",
      data: {
        id: table.id,
        table_number: table.table_number,
        qr_code_url: table.qr_code_url,
        qr_code_image: table.qr_code_image,
        qr_generated_at: table.qr_generated_at,
      },
    });
  } catch (error) {
    console.error("Failed to generate table QR code:", error);
    return createErrorResponse("Failed to generate QR code.", 500);
  }
}
