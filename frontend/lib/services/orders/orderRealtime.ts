import { supabase } from "@/lib/config/supabaseClient";

/**
 * Shared topic name so order-creation flows (POS, QR checkout) and the
 * screens that display live orders (staff order board, kitchen) are all
 * talking on the same Realtime channel.
 */
export const ORDERS_REALTIME_CHANNEL = "orders-realtime";
export const NEW_ORDER_BROADCAST_EVENT = "new_order";

/**
 * Broadcasts a "new order" event the instant an order is created, instead of
 * waiting for postgres_changes to replicate through the WAL (which can lag
 * several seconds). Listeners should still keep their postgres_changes
 * subscription as a fallback in case a broadcast is missed.
 */
export function broadcastNewOrder(orderId: string) {
  const channel = supabase.channel(ORDERS_REALTIME_CHANNEL);

  channel.subscribe((status) => {
    if (status !== "SUBSCRIBED") return;

    channel.send({
      type: "broadcast",
      event: NEW_ORDER_BROADCAST_EVENT,
      payload: { orderId },
    });

    setTimeout(() => {
      supabase.removeChannel(channel);
    }, 1000);
  });
}
