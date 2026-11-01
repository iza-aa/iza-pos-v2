# IZA POS v2 — Fullstack Restaurant POS & Store Operations

![Next.js 15](https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js)
![React 19](https://img.shields.io/badge/React-19.1-blue?style=flat-square&logo=react)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-emerald?style=flat-square&logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-38bdf8?style=flat-square&logo=tailwindcss)
![PWA](https://img.shields.io/badge/PWA-Ready-orange?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

A production-grade, cloud-native Point of Sale (POS) and store management platform engineered for cafes, coffee shops, and modern quick-service restaurants. Features self-service QR table ordering, anti-fraud staff attendance kiosks, automated bookkeeping, real-time kitchen queues, and owner analytics snapshot engines across **94,000+ lines of TypeScript and 114 App Router routes**.

Live Demo: [https://iza-pos-v2.vercel.app](https://iza-pos-v2.vercel.app)

---

## 🏛️ System Architecture Topology

```
+-----------------------------------------------------------------------------------+
|                        Next.js 15 App Router (PWA Client)                         |
|      (/owner dashboard · /manager live queue · /customer table sessions)         |
+-----------------------------------------------------------------------------------+
                                   |                     |
     Geolocation & Camera Scanner  |                     | Custom JWT Refresh Middleware
                                   v                     v
+------------------------------------+        +-------------------------------------+
| Geofencing Radius Verification     |        | Supabase PostgreSQL (Cloud)         |
| - Dynamic short-lived QR tokens    |        | - Multi-tenant Row Level Security   |
| - Server-side Haversine distance   |        | - Real-time websocket mutations     |
+------------------------------------+        +-------------------------------------+
                                                         |
                                                         v
                                              +---------------------+
                                              | Web Push & Service  |
                                              | Worker Dispatcher   |
                                              +---------------------+
```

---

## 🌟 Core Modules & Engineering Capabilities

### 1. Self-Service QR Table Ordering
- Dynamic, table-specific QR tokens with automated expiration and recycling to prevent abandoned cart locks.
- Real-time cart synchronization directly linked to kitchen ticket printers and cashier queues.
- Seamless guest checkout supporting multiple payment methods with split-bill capability.

### 2. Tamper-Resistant Staff Attendance Kiosk
- Hardware tablet kiosk rendering auto-refreshing QR codes with sub-minute time-to-live (TTL).
- Multi-factor verification: Staff scan kiosk QR via mobile camera while submitting GPS coordinates.
- **Server-Side Geofencing:** Client coordinates are validated against store physical boundaries on the server using Haversine math; distance assertions from mobile browsers are never trusted.

### 3. Kitchen & Cashier Real-Time Command Center
- Live order boards utilizing Supabase Realtime WebSocket subscriptions for instantaneous ticket delivery.
- Cashier register shift management with opening drawer declarations, difference tracking, and automated deposit balancing.

### 4. Owner Insights & Financial Snapshot Engine
- Deterministic calculation services (`salesSnapshotBuilder.ts`, `inventorySnapshotBuilder.ts`) processing live transaction logs.
- Automatic calculation of Cost of Goods Sold (COGS), daily estimated net profit, Average Order Value (AOV), and inventory turnover health without black-box drift.

### 5. Custom Supabase JWT Session Refresh
- Proactive token refresh middleware handling edge-case token expiration during 12-hour continuous cashier shifts, guaranteeing zero dropped checkout requests.

---

## 📂 Project Structure

```
iza-pos-v2/
├── frontend/
│   ├── app/                    # 114 App Router routes & API endpoints
│   │   ├── (auth)/             # Login, register, password reset flows
│   │   ├── customer/           # Table QR session ordering interface
│   │   ├── manager/            # Live order board, inventory, tables, staff
│   │   ├── owner/              # Analytics, bookkeeping, reports, settings
│   │   └── api/                # Secure server endpoints (attendance, auth, sync)
│   ├── lib/
│   │   ├── services/           # Domain business logic (attendance, loyalty, orders)
│   │   ├── supabase/           # SSR and client database connection factories
│   │   └── utils/              # Calculation utilities and formatting
│   ├── tests/                  # Automated test suites
│   ├── public/                 # Static assets and PWA service worker icons
│   └── next.config.ts          # Turbopack & PWA configuration
├── docs/                       # Architecture plans, RLS specs, and kiosk designs
├── .gitignore                  # Root-level ignore rules
└── LICENSE                     # MIT License
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js `>= 20.x`
- Supabase project with PostgreSQL

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/iza-aa/iza-pos-v2.git
   cd iza-pos-v2/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Provide your Supabase URL, Anon Key, Service Role Key, and app base URL.

4. Start development server with Turbopack:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Security & Data Integrity

- **Row Level Security (RLS):** Every database table enforces granular tenant-isolated RLS policies preventing cross-store data leakage.
- **Server Authorization:** All sensitive state transitions (shift closing, discount applications, refunds) are enforced strictly on server route handlers.
- **PWA Offline Resilience:** Service worker caching ensures menu browsing remains responsive even during intermittent network drops.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
