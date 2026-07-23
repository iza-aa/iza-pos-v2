/**
 * QR Code Service
 * Handles QR code generation and management
 */

import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import type { Table } from "@/lib/types/table";

type BulkGenerateResult = {
  success: number;
  failed: number;
  errors: string[];
};

type TableQRLookup = {
  qr_code_image: string | null;
};

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return normalizeOrigin(window.location.origin);
  }

  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (configuredUrl) {
    return normalizeOrigin(configuredUrl);
  }

  return "http://localhost:3000";
}

/**
 * Generate customer URL for a table.
 * Current professional QR flow:
 * /customer/table/{tableId}
 */
export function generateCustomerUrl(tableId: string): string {
  return `${getBaseUrl()}/customer/table/${encodeURIComponent(tableId)}`;
}

/**
 * Generate QR code data URL
 */
export async function generateQRCode(data: string): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      width: 512,
      margin: 2,
      color: {
        dark: "#111827",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "H",
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw new Error("Failed to generate QR code");
  }
}

/**
 * Generate QR code for a table
 */
export async function generateTableQR(tableId: string): Promise<string> {
  const customerUrl = generateCustomerUrl(tableId);
  return generateQRCode(customerUrl);
}

/**
 * Generate and save QR code for a table.
 * qr_code_url stores the customer URL.
 * qr_code_image stores the generated QR data image.
 */
export async function generateAndSaveTableQR(
  tableId: string,
  tableNumber: string,
): Promise<Table> {
  const supabase = await createClient();

  try {
    const customerUrl = generateCustomerUrl(tableId);
    const qrCodeImage = await generateQRCode(customerUrl);

    const { data, error } = await supabase
      .from("tables")
      .update({
        qr_code_url: customerUrl,
        qr_code_image: qrCodeImage,
        qr_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", tableId)
      .select()
      .single();

    if (error) {
      console.error("Error saving QR code to table:", error);
      throw new Error(`Failed to save QR code: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Failed to save QR code for table ${tableNumber}`);
    }

    return data as Table;
  } catch (error) {
    console.error("Error in generateAndSaveTableQR:", error);
    throw error;
  }
}

/**
 * Regenerate QR code for a table
 */
export async function regenerateTableQR(
  tableId: string,
  tableNumber: string,
): Promise<Table> {
  return generateAndSaveTableQR(tableId, tableNumber);
}

/**
 * Generate QR codes for multiple tables
 */
export async function generateBulkTableQR(
  tables: Array<{ id: string; table_number: string }>,
): Promise<BulkGenerateResult> {
  const results: BulkGenerateResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const table of tables) {
    try {
      await generateAndSaveTableQR(table.id, table.table_number);
      results.success += 1;
    } catch (error) {
      results.failed += 1;
      results.errors.push(
        `Table ${table.table_number}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  return results;
}

/**
 * Delete QR code for a table.
 * Since QR images are stored as data URLs in qr_code_image,
 * no storage file deletion is required here.
 */
export async function deleteTableQR(tableId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tables")
    .update({
      qr_code_url: null,
      qr_code_image: null,
      qr_generated_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tableId);

  if (error) {
    console.error("Error clearing QR code fields:", error);
    throw new Error(`Failed to clear QR code: ${error.message}`);
  }
}

/**
 * Download QR code as PNG
 */
export async function downloadQRCode(tableId: string, tableNumber: string): Promise<void> {
  const qrDataUrl = await generateTableQR(tableId);

  const link = document.createElement("a");
  link.href = qrDataUrl;
  link.download = `table-${tableNumber}-qr.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Print QR code
 */
export async function printQRCode(tableId: string, tableNumber: string): Promise<void> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("tables")
    .select("qr_code_image")
    .eq("id", tableId)
    .maybeSingle();

  const tableQrLookup = data as TableQRLookup | null;
  const qrDataUrl = tableQrLookup?.qr_code_image || (await generateTableQR(tableId));

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    throw new Error("Failed to open print window. Please allow pop-ups.");
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Table ${tableNumber} QR Code</title>
        <style>
          @media print {
            body {
              margin: 0;
              padding: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
          }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            text-align: center;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            color: #111827;
          }
          .table-number {
            font-size: 48px;
            font-weight: bold;
            margin-bottom: 30px;
            color: #111827;
          }
          .qr-container {
            margin: 20px 0;
          }
          .instructions {
            margin-top: 30px;
            font-size: 16px;
            color: #6B7280;
          }
        </style>
      </head>
      <body>
        <div class="title">Restaurant Table QR Code</div>
        <div class="table-number">Table ${tableNumber}</div>
        <div class="qr-container">
          <img src="${qrDataUrl}" alt="QR Code" style="max-width: 400px;" />
        </div>
        <div class="instructions">
          Scan this QR code to view menu and place orders
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
}
