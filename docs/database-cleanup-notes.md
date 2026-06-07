# Database Cleanup Notes

Last updated: 2026-06-07

## Bilingual UI Rule

- Keep database values as canonical slugs or stable English identifiers.
- Translate labels in the UI layer only.
- Do not translate user-entered content from Supabase, such as item names, product names, notes, supplier names, staff names, and report notes.
- Use `frontend/app/components/shared/i18n/domainLabels.ts` for enum-like values shown to users.

## Current i18n Foundation

- Language state is stored in `localStorage` as `iza_language`.
- Supported languages: `en`, `id`.
- Shared provider: `frontend/app/components/shared/i18n/LanguageProvider.tsx`.
- Static copy dictionary: `frontend/app/components/shared/i18n/translations.ts`.
- Supabase/domain label mapping: `frontend/app/components/shared/i18n/domainLabels.ts`.

## Fields To Audit During Cleanup

- `inventory_items.tracking_mode`
  - Current values: `direct_auto_deduct`, `kitchen_station_auto_deduct`, `bulk_usage_expense`.
  - UI label should explain business behavior, not expose raw enum names.

- `inventory_items.station_scope`
  - Current values: `kitchen`, `barista`, `shared`.
  - Confirm whether `barista` should be renamed to `bar` in UI only or migrated in DB later.

- `stock_reports.report_type`
  - Values seen in code: `low_stock`, `out_of_stock`, `waste_damaged`, `restock_request`, `testing_usage`, `waste`, `damaged`, `expired`, `kitchen_note`, `stock_check`, `test_food`, `test_drink`, `test_ingredient`.
  - Needs one canonical list before strict DB constraints are added.

- `stock_reports.station_scope`
  - Used for manager and staff report filtering.
  - Confirm all report creation paths write this field consistently.

- `kitchen_station_movements.movement_type`
  - Current values include `transfer_in`, `pos_usage`, `bulk_opened`, `waste`, `closing_count`, `adjustment`, `reversal`.
  - UI should prefer business wording such as opened ingredient, moved to kitchen, POS usage, and waste.

- `kitchen_station_batches.station_status`
  - Current values include `planned`, `thawing`, `prep`, `ready`, `finished`, `waste`.
  - Confirm whether `finished` means used up, closed, or no longer available.

- `menu_bundles.display_order`
  - UI label is `Menu Position`.
  - Keep DB field name unless a broader menu ordering cleanup happens.

- Legacy cost fields
  - `inventory_items.price_per_unit` should not be used by new code unless the column truly exists.
  - Prefer `inventory_items.cost_per_unit` and batch-level `inventory_batches.unit_cost`.

## Owner Translation Status

- Done: navbar labels, role switcher labels, language switcher, notification modal shell, profile modal shell, owner dashboard sidebar.
- Done: owner bookkeeping sidebar, business date filter, primary status/error messages, closings tab, auto ledger tab, cost and margin tab, expenses tab, tax and charge settings, and review queue tab.
- Done: owner staff manager header search/add controls.
- Done: owner activity log empty state and stats cards.
- Done: owner dashboard tab content for Overview, Sales, Customer Performance, Customer Discounts/Menu Bundles, Inventory, Staff, Operations, including export workbook headers and visible chart/table/modal copy.
- Query audit: owner dashboard Supabase queries keep product names, inventory names, supplier names, staff names, notes, batch numbers, payment methods, order status values, and other user/database values as-is. UI labels, report type labels, status labels, and fallback copy are translated in the frontend.
- Pending for later pass: staff manager forms/modals, attendance manager copy, activity log filters/table/detail, owner login, and owner profile page.

## Owner Feature Map For Bilingual Rollout

- Owner dashboard
  - Shell: `frontend/app/components/owner/business-dashboard/OwnerBusinessDashboard.tsx`
  - Large dashboard content: `frontend/app/components/owner/business-dashboard/tabs/StandardDashboardPanels.tsx`
  - Modular dashboard content: `overview`, `sales`, and `customer` folders under `tabs`.

- Owner bookkeeping
  - Shell: `frontend/app/components/owner/bookkeeping/OwnerBookkeeping.tsx`
  - Tabs: `frontend/app/components/owner/bookkeeping/tabs`.

- Owner staff manager
  - Page: `frontend/app/owner/staff-manager/page.tsx`
  - Components: `frontend/app/components/owner/staffmanager`.

- Owner activity log
  - Page: `frontend/app/owner/activitylog/page.tsx`
  - Components: `frontend/app/components/owner/activitylog`.

- Owner profile, login, archives
  - Pages under `frontend/app/owner`.

## Cleanup Principle

When a field has both business meaning and technical meaning, keep the technical value stable in Supabase and create a UI label map. This keeps reports, filters, API queries, and historical rows safe while still allowing bilingual internal screens.
