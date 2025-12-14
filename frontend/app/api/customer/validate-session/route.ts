import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Validate customer table session
 * Checks if table is still occupied (has active orders)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tableId = searchParams.get('table_id');

  if (!tableId) {
    return NextResponse.json(
      { success: false, error: 'Table ID is required' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    // Get table info
    const { data: table, error: tableError } = await supabase
      .from('tables')
      .select('*')
      .eq('id', tableId)
      .eq('is_active', true)
      .single();

    if (tableError || !table) {
      return NextResponse.json(
        { success: false, error: 'Table not found' },
        { status: 404 }
      );
    }

    // Check if table has active orders (not completed/cancelled)
    const { data: activeOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('table_id', tableId)
      .in('status', ['new', 'preparing', 'partially-served', 'served'])
      .limit(1);

    if (ordersError) {
      throw ordersError;
    }

    const isOccupied = activeOrders && activeOrders.length > 0;

    return NextResponse.json({
      success: true,
      data: {
        table_id: table.id,
        table_number: table.table_number,
        is_occupied: isOccupied,
        status: table.status
      }
    });
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate session' },
      { status: 500 }
    );
  }
}
