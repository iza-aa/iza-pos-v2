"use server";

export async function sendOrderNotification(orderId: string, orderNumber: string, roles: string[]) {
  try {
    // NEXT_PUBLIC_SITE_URL = set manually in Vercel env vars (e.g. https://iza-pos-v2.vercel.app)
    // VERCEL_URL = auto-set by Vercel (without https://)
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    // Determine title and body based on roles
    const isKitchen = roles.includes('kitchen');
    const title = isKitchen ? 'New Order to Prepare!' : 'New Order Received!';
    const body = `Order #${orderNumber} has been placed.`;
    const url = isKitchen ? '/staff/kitchen' : '/staff/order';

    const res = await fetch(`${baseUrl}/api/web-push/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.PUSH_SEND_SECRET}`
      },
      body: JSON.stringify({
        title,
        body,
        orderId,
        url,
        targetRoles: roles
      })
    });
    
    if (!res.ok) {
      console.error("Failed to trigger push notification", await res.text());
    }
  } catch (error) {
    console.error("Error in sendOrderNotification action", error);
  }
}
