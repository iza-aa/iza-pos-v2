import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

// Use service role to bypass RLS — the real auth is the PUSH_SEND_SECRET
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Try to get the current session (best-effort — iOS PWA may not send cookies)
    let userId: string | null = null;
    try {
      const cookieStore = await cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) { return cookieStore.get(name)?.value; },
            set() {},
            remove() {},
          },
        }
      );
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id ?? null;
    } catch {
      // Session unavailable — continue without user_id
    }

    const { subscription, role } = await req.json();

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
    }

    console.log(`[push-subscribe] Saving subscription for role="${role}" userId="${userId}"`);

    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          role: role || 'staff',
          endpoint: subscription.endpoint,
          auth_keys: subscription.keys,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      );

    if (error) {
      console.error('[push-subscribe] Error saving subscription:', error);
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
    }

    console.log(`[push-subscribe] Saved OK endpoint=${subscription.endpoint.slice(0, 60)}...`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[push-subscribe] Subscription error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
