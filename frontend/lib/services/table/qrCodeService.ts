/**
 * QR Code Service
 * Handles QR code generation and management
 */

import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/client';
import type { Table } from '@/lib/types/table';

/**
 * Generate QR code data URL
 */
export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(data, {
      width: 512,
      margin: 2,
      color: {
        dark: '#111827', // gray-900
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H', // High error correction
    });
    return qrDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate customer URL for a table
 */
export function generateCustomerUrl(tableNumber: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
  return `${baseUrl}/customer?table=${tableNumber}`;
}

/**
 * Generate QR code for a table
 */
export async function generateTableQR(tableNumber: string): Promise<string> {
  const customerUrl = generateCustomerUrl(tableNumber);
  return generateQRCode(customerUrl);
}

/**
 * Upload QR code to Supabase Storage
 */
export async function uploadQRCode(
  tableNumber: string, 
  qrDataUrl: string
): Promise<string> {
  const supabase = createClient();
  
  // Convert data URL to blob
  const response = await fetch(qrDataUrl);
  const blob = await response.blob();
  
  // Create file name
  const fileName = `table-${tableNumber}-${Date.now()}.png`;
  const filePath = `qr-codes/${fileName}`;
  
  // Upload to storage
  const { data, error } = await supabase.storage
    .from('restaurant')
    .upload(filePath, blob, {
      contentType: 'image/png',
      upsert: true,
    });
  
  if (error) {
    console.error('Error uploading QR code:', error);
    throw new Error(`Failed to upload QR code: ${error.message}`);
  }
  
  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from('restaurant')
    .getPublicUrl(filePath);
  
  return publicUrlData.publicUrl;
}

/**
 * Generate and save QR code for a table
 */
export async function generateAndSaveTableQR(
  tableId: string, 
  tableNumber: string
): Promise<Table> {
  const supabase = createClient();
  
  try {
    // Generate QR code
    const qrDataUrl = await generateTableQR(tableNumber);
    
    // Upload to storage
    const qrCodeUrl = await uploadQRCode(tableNumber, qrDataUrl);
    
    // Generate customer URL
    const customerUrl = generateCustomerUrl(tableNumber);
    
    // Update table with QR code info
    const { data, error } = await supabase
      .from('tables')
      .update({
        qr_code_url: qrCodeUrl,
        qr_customer_url: customerUrl,
        qr_generated_at: new Date().toISOString(),
      })
      .eq('id', tableId)
      .select()
      .single();
    
    if (error) {
      console.error('Error saving QR code to table:', error);
      throw new Error(`Failed to save QR code: ${error.message}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error in generateAndSaveTableQR:', error);
    throw error;
  }
}

/**
 * Regenerate QR code for a table
 */
export async function regenerateTableQR(
  tableId: string, 
  tableNumber: string
): Promise<Table> {
  const supabase = createClient();
  
  // Get current table data
  const { data: table } = await supabase
    .from('tables')
    .select('qr_code_url')
    .eq('id', tableId)
    .single();
  
  // Delete old QR code from storage if exists
  if (table?.qr_code_url) {
    try {
      const urlParts = table.qr_code_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `qr-codes/${fileName}`;
      
      await supabase.storage
        .from('restaurant')
        .remove([filePath]);
    } catch (error) {
      console.error('Error deleting old QR code:', error);
      // Continue anyway
    }
  }
  
  // Generate new QR code
  return generateAndSaveTableQR(tableId, tableNumber);
}

/**
 * Generate QR codes for multiple tables
 */
export async function generateBulkTableQR(
  tables: Array<{ id: string; table_number: string }>
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };
  
  for (const table of tables) {
    try {
      await generateAndSaveTableQR(table.id, table.table_number);
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(
        `Table ${table.table_number}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  
  return results;
}

/**
 * Delete QR code for a table
 */
export async function deleteTableQR(tableId: string): Promise<void> {
  const supabase = createClient();
  
  // Get table data
  const { data: table } = await supabase
    .from('tables')
    .select('qr_code_url')
    .eq('id', tableId)
    .single();
  
  if (!table?.qr_code_url) {
    return; // No QR code to delete
  }
  
  // Delete from storage
  try {
    const urlParts = table.qr_code_url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `qr-codes/${fileName}`;
    
    await supabase.storage
      .from('restaurant')
      .remove([filePath]);
  } catch (error) {
    console.error('Error deleting QR code from storage:', error);
  }
  
  // Clear QR code fields in table
  const { error } = await supabase
    .from('tables')
    .update({
      qr_code_url: null,
      qr_customer_url: null,
      qr_generated_at: null,
    })
    .eq('id', tableId);
  
  if (error) {
    console.error('Error clearing QR code fields:', error);
    throw new Error(`Failed to clear QR code: ${error.message}`);
  }
}

/**
 * Download QR code as PNG
 */
export async function downloadQRCode(tableNumber: string): Promise<void> {
  const qrDataUrl = await generateTableQR(tableNumber);
  
  // Create download link
  const link = document.createElement('a');
  link.href = qrDataUrl;
  link.download = `table-${tableNumber}-qr.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Print QR code
 */
export async function printQRCode(tableNumber: string): Promise<void> {
  const qrDataUrl = await generateTableQR(tableNumber);
  
  // Create print window
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Failed to open print window. Please allow pop-ups.');
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
  
  // Wait for image to load before printing
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
}
