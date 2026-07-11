Implementasi PWA & Web Push Notification (Revisi v2)

Dokumen ini merinci rencana teknis (fase per fase) untuk mengimplementasikan Web Push Notification ke dalam sistem IZA POS agar staff Kasir dan Dapur bisa menerima notifikasi pesanan masuk secara real-time, walaupun layar aplikasi sedang dimatikan atau berada di background.

Catatan Revisi dari Versi Awal


Endpoint subscribe divalidasi dengan session Supabase (bukan open POST).
Ditambahkan RLS policy untuk tabel push_subscriptions.
Strategi multi-device per user (endpoint unique, bukan overwrite by user_id).
Cleanup otomatis subscription yang expired/invalid (404/410).
notificationclick handler ditambahkan di service worker.
Endpoint /send dijaga dengan secret/signature, tidak bisa dipanggil sembarangan.
Runtime Node.js diwajibkan untuk route yang pakai web-push.
VAPID subject (mailto:) ditambahkan.
Meta tag iOS tambahan di luar manifest.json.
Payload push dibuat kecil, detail order di-fetch saat diklik.
Catatan next-pwa disabled by default di dev mode.
Open questions dijawab dengan rekomendasi default.



Open Questions — Rekomendasi

Siapa yang menerima notifikasi?
Rekomendasi: role-based. Kasir menerima semua order baru (perlu konfirmasi/proses pembayaran). Dapur hanya menerima order yang statusnya sudah "paid/confirmed" dan berisi item yang perlu disiapkan (food/drink). Manajer opsional, bisa di-subscribe manual lewat toggle di settings, tidak default on.
→ Perlu konfirmasi: apakah dapur perlu breakdown per jenis item (makanan vs minuman) atau cukup satu notifikasi umum per order?

Audio custom?
Rekomendasi: mulai dengan notifikasi standar OS dulu (lebih simpel, tidak butuh asset tambahan, dan lebih konsisten cross-device). Audio custom bisa ditambahkan belakangan sebagai enhancement, karena custom sound di Web Push punya dukungan browser yang tidak konsisten (khususnya iOS Safari cenderung override dengan sound default OS).


IMPORTANT — Limitasi Platform


iOS (iPhone/iPad): wajib Add to Home Screen, minimum iOS 16.4+. Tanpa ini push diblokir total oleh Safari.
iOS juga butuh meta tag tambahan, bukan cuma manifest.json — lihat Phase 2.
Push API hanya jalan di HTTPS (kecuali localhost). Untuk testing di jaringan lokal/device fisik, gunakan tunnel (ngrok) atau deploy ke Vercel preview URL.
web-push tidak jalan di Edge Runtime — semua API route yang mengirim push wajib export const runtime = 'nodejs'.



Phase 1: Database & Dependencies Setup

- [x] [MODIFY] package.json
Tambahkan web-push dan @types/web-push.

- [x] [NEW] Tabel Supabase: push_subscriptions

KolomTipeCatatanidUUID (PK)default gen_random_uuid()user_idUUID (FK → staff/users)pemilik deviceroletextuntuk broadcast per role (kasir/dapur/manajer)endpointtextUNIQUE constraint — 1 device = 1 baris, mencegah duplikatauth_keysjsonb{ p256dh, auth }created_attimestamptzdefault now()last_seen_attimestamptzupdate tiap kali subscribe ulang, buat deteksi device mati

Catatan: user_id boleh punya banyak baris (satu per device). Jangan upsert by user_id — upsert by endpoint saja, supaya multi-device (HP + tablet) tetap jalan.

RLS Policy (wajib, tidak ada di draft awal):


INSERT: hanya boleh insert row dengan user_id = auth.uid().
SELECT/DELETE: hanya bisa akses row milik sendiri, kecuali service role key (dipakai backend saat kirim broadcast — bypass RLS via service role, bukan lewat client).


- [x] [NEW] frontend/.env.local

NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@izapos.app   # wajib diisi, jangan kosong
PUSH_SEND_SECRET=...                     # untuk verifikasi endpoint /send


Phase 2: Konfigurasi Next.js PWA & Service Worker

- [x] [MODIFY] frontend/next.config.ts
Konfigurasi next-pwa, dest: "public".
⚠️ Catatan penting: next-pwa secara default disabled di next dev. Kalau mau test push saat development, set disable: process.env.NODE_ENV === "development" ? false : false sesuai kebutuhan, atau selalu test via next build && next start.

- [x] [NEW] frontend/public/manifest.json
Nama app, theme color, icon set (minimal 192x192 dan 512x512, plus maskable icon).

- [x] [NEW] Meta tags tambahan di <head> (khusus iOS, di luar manifest.json)

html<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="IZA POS" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />

Safari masih tidak sepenuhnya reliable membaca manifest.json untuk semua metadata home-screen, jadi meta tag ini tetap wajib sebagai fallback.

- [x] [NEW] custom service worker (worker/index.ts)

jsself.addEventListener('push', (event) => {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      data: { orderId: data.orderId, url: data.url || '/' },
    })
  );
});

// Tidak ada di draft awal — wajib supaya klik notifikasi membuka app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      const url = event.notification.data?.url || '/';
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});


Phase 3: Push Notification API & Subscription Flow

- [x] [NEW] frontend/app/api/web-push/subscribe/route.ts

export const runtime = 'nodejs';


Validasi session user (Supabase auth) — tolak request tanpa session valid.
Upsert by endpoint (bukan user_id), update last_seen_at.


- [x] [NEW] frontend/app/api/web-push/send/route.ts

export const runtime = 'nodejs';


Verifikasi request pakai PUSH_SEND_SECRET (header custom) sebelum proses apapun — mencegah endpoint ini dipanggil sembarangan dari luar.
Payload dibuat kecil (order ID + ringkasan singkat saja), bukan detail lengkap order — klien fetch detail dari API saat notifikasi diklik.
Kirim ke tiap subscription pakai try/catch per-item (satu gagal tidak boleh menghentikan pengiriman ke device lain).
Tangani error dari web-push:

statusCode 404 / 410 → hapus baris subscription dari DB (device sudah tidak valid).
statusCode 429 → backoff, jangan retry langsung.





- [x] [MODIFY] Frontend UI
Tombol "Enable Notifications" + register service worker + pushManager.subscribe(...), kirim ke /api/web-push/subscribe dengan auth token.


Phase 4: Integrasi Trigger Pembuatan Pesanan

Opsi A (Supabase Database Webhook): trigger otomatis tiap insert ke tabel orders, memanggil /api/web-push/send dengan header secret yang sesuai PUSH_SEND_SECRET.

- [x] Opsi B (langsung dari API order): panggil fungsi kirim push setelah pesanan dibuat (di checkout).

Rekomendasi: Opsi B lebih aman untuk kontrol logic per-role dan lebih mudah didebug dibanding Database Webhook yang blackbox.


Verification Plan

Manual Verification


Build production (next build && next start) — jangan test di next dev.
Buka app role Kasir di Android, klik "Allow Notifications".
Minimize/tutup tab.
Simulasikan order dari halaman Customer (scan QR).
Pastikan notifikasi muncul dengan suara OS, dan klik notifikasi membuka app ke halaman order terkait.
Ulangi di iPhone (iOS 16.4+), wajib Add to Home Screen dulu sebelum test.
Test cleanup: uninstall/clear data di satu device, kirim order baru, pastikan baris subscription device tersebut otomatis terhapus dari push_subscriptions (bukan cuma gagal diam-diam).
Test multi-device: login staff yang sama di 2 device, pastikan keduanya menerima notifikasi.