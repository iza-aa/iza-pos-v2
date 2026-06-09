# Manager Bilingual Checklist

Last updated: 2026-06-09

Dokumen ini dipakai untuk melanjutkan penerapan bilingual pada seluruh fitur manager tanpa mencampur checklist teknis ke `database-cleanup-notes.md`.

## Goal

Seluruh teks UI manager harus memakai sistem i18n yang sama dengan owner. Data yang berasal dari Supabase seperti nama produk, nama kategori, nama meja, nama staff, supplier, notes, dan custom input tetap tampil apa adanya karena itu adalah data bisnis, bukan label UI.

## Current Status

| Area | Files | Status | Notes |
|---|---|---|---|
| Shared navbar/sidebar | `frontend/app/components/ui/Navigation/*` | Done | Language toggle sudah tersedia di navbar. |
| Shared profile | `frontend/app/components/shared/ProfileSection.tsx` | Done | Dipakai owner/manager/staff profile. |
| Shared date range | `frontend/app/components/shared/DateRangeFilter.tsx` | Done | Mobile behavior sudah dijaga. |
| Manager staff shell | `frontend/app/manager/staff-manager/page.tsx` | Done | Page title, loading, errors, login code modal sudah memakai i18n. |
| Manager table shell | `frontend/app/manager/table-management/page.tsx` | Done | Page title, floor actions, empty state, delete messages sudah memakai i18n. |
| Manager table components | `frontend/app/components/manager/tablemanager/*` | Pending | Modal, form, QR, table/floor cards perlu scan detail. |
| Manager menu | `frontend/app/manager/menu/page.tsx`, `frontend/app/components/manager/menu/*` | Pending | Menu, category, variants, recipe, discount/bundle labels perlu audit. |
| Manager inventory | `frontend/app/manager/inventory/page.tsx`, `frontend/app/components/manager/inventory/*` | Pending | Area terbesar: inventory tabs, restock, recipe, stock report, kitchen station labels. |
| Manager order | `frontend/app/manager/order/page.tsx` | Pending | Order status, correction review, filter, table/card responsive labels. |
| Manager closing | `frontend/app/manager/closing/page.tsx` | Pending | Operational closing, shift closing, cash count, exception labels. |
| Manager notifications | `frontend/app/components/shared/notifications/useManagerNotifications.ts` | Pending | Trigger sudah ada, text masih perlu masuk i18n. |

## Implementation Order

1. Finish manager table components because page shell already translated.
2. Continue to manager staff child components if hardcoded text remains.
3. Translate manager order because scope lebih kecil dan bisa cepat selesai.
4. Translate manager closing.
5. Translate manager menu.
6. Translate manager inventory last because paling besar dan paling rawan menyentuh istilah inventory.
7. Translate manager notifications after destination pages/actions are stable.

## Namespace Rules

Use predictable keys so translation work remains searchable:

- `manager.table.*`
- `manager.staff.*`
- `manager.order.*`
- `manager.closing.*`
- `manager.menu.*`
- `manager.inventory.*`
- `manager.notifications.*`
- `common.*` for reusable words like Save, Cancel, Delete, Search, Status, Date.
- `domainLabels.ts` for database enum labels.

Do not translate database enum values directly in query logic. Translate only when rendering labels.

## Database Cleanup Notes

Manager bilingual work should help database cleanup, not hide database issues.

- Keep database slugs stable: `pending`, `resolved`, `completed`, `served`, `cancelled`, `direct_auto_deduct`, `kitchen_station_auto_deduct`, `bulk_usage_expense`, `barista`, `kitchen`, `shared`.
- If a column exists only to support old UI copy or deprecated routes, add it to `docs/database-cleanup-notes.md`.
- Product/category/floor/table/staff names from Supabase are user data and should not be added to translation files.
- Do not reintroduce deprecated manager features: manager dashboard, manager rewards, or manager bookkeeping page.
- If a Supabase value needs a user-facing label, add a label map instead of changing the stored value.

## Translation File Split Decision

`frontend/app/components/shared/i18n/translations.ts` is now large enough that splitting is the better long-term structure. The split should preserve the current provider API so pages do not need a broad refactor.

Recommended structure:

```text
frontend/app/components/shared/i18n/translations/
  common.ts
  navigation.ts
  owner.ts
  manager.ts
  staff.ts
  customer.ts
  index.ts
```

Compatibility approach:

```ts
// frontend/app/components/shared/i18n/translations.ts
export { translations } from "./translations";
```

`translations/index.ts` composes all domain dictionaries into the same final shape:

```ts
export const translations = {
  en: {
    ...common.en,
    ...navigation.en,
    ...owner.en,
    ...manager.en,
  },
  id: {
    ...common.id,
    ...navigation.id,
    ...owner.id,
    ...manager.id,
  },
};
```

Recommended timing:

- Short term: keep adding manager keys to the current `translations.ts` to avoid mixing UI translation work with a file-structure refactor.
- After manager bilingual is stable: split owner and manager dictionaries first.
- After staff/customer bilingual starts: add `staff.ts` and `customer.ts`.

## Validation Checklist

- Run duplicate-key check for `en` and `id`.
- Run eslint on changed pages/components.
- Scan each manager route/component with `rg` for user-facing hardcoded English/Indonesian text.
- Verify dynamic Supabase values still display as data, not translation keys.
- Update `docs/database-cleanup-notes.md` when bilingual work reveals unused columns, old enum values, or deprecated routes.

## Completion Criteria

Manager bilingual is complete when:

- Navbar/sidebar/profile/date range are bilingual.
- Manager Staff, Table, Order, Closing, Menu, Inventory, and Notifications have no hardcoded UI copy.
- All manager modals, empty states, toasts, filters, table headers, cards, and buttons use i18n.
- Database labels are translated through render helpers, not by changing stored values.
- `docs/database-cleanup-notes.md` contains all cleanup findings discovered during the pass.
