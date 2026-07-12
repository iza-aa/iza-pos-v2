import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webPush from 'web-push';

export const runtime = 'nodejs';

// Setup web-push
webPush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// We use service role key to bypass RLS so we can fetch all subscriptions
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Secret
    const authHeader = req.headers.get('authorization');
    const secret = process.env.PUSH_SEND_SECRET;
    
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse payload
    const { title, body, orderId, url, targetRoles } = await req.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'Missing title or body' }, { status: 400 });
    }

    // 3. Fetch Subscriptions
    let query = supabaseAdmin.from('push_subscriptions').select('*');
    
    if (targetRoles && Array.isArray(targetRoles) && targetRoles.length > 0) {
      query = query.in('role', targetRoles);
    }
    
    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('Failed to fetch subscriptions', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No subscriptions found' });
    }

    // 4. Send pushes
    const payload = JSON.stringify({
      title,
      body,
      orderId,
      url: url || `/staff/order`
    });

    const sendPromises = subscriptions.map(async (sub) => {
      // auth_keys may be stored as a JSON string or already as an object
      const keys = typeof sub.auth_keys === 'string' ? JSON.parse(sub.auth_keys) : sub.auth_keys;
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth,
        }
      };

      try {
        await webPush.sendNotification(pushSubscription, payload);
        console.log(`[push-send] Sent to role=${sub.role} endpoint=${sub.endpoint.slice(0, 60)}...`);
      } catch (err: any) {
        // Handle cleanup for invalid endpoints
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log(`[push-send] Expired subscription for endpoint: ${sub.endpoint.slice(0, 60)}. Deleting...`);
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.error(`[push-send] Failed to send to endpoint ${sub.endpoint.slice(0, 60)}:`, err.statusCode, err.message);
        }
      }
    });

    await Promise.all(sendPromises);

    console.log(`[push-send] Done. Attempted to send to ${subscriptions.length} subscription(s).`);
    return NextResponse.json({ success: true, sent: subscriptions.length });

  } catch (err) {
    console.error('Push send error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
