# Database Cleanup Notes

Last updated: 2026-06-08

## Cleanup Goal

This document is the cleanup contract before changing Supabase schema or deleting legacy fields. Keep it close to the actual app behavior so database cleanup does not break owner insights, manager inventory, staff reports, kitchen station, POS order flow, bilingual UI, or thesis documentation.

Before dropping a column/table/value:

- Search the codebase for the exact table, column, and enum value.
- Confirm whether the value is historical data, technical status, or user-facing copy.
- Migrate old rows first when the value is still needed by reports.
- Update `domainLabels.ts` or translation keys when only the label changes.
- Do not silently fallback from missing columns for core business metrics; add the intended column or refactor all reads/writes to the real source.

## Bilingual UI Rule

- Keep database values as canonical slugs or stable English identifiers.
- Translate labels in the UI layer only.
- Do not translate user-entered content from Supabase, such as item names, product names, notes, supplier names, staff names, and report notes.
- Use `frontend/app/components/shared/i18n/domainLabels.ts` for enum-like values shown to users.
- Database cleanup should help i18n by making enum values consistent, not by storing Indonesian labels in Supabase.

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
  - Business meaning:
    - `direct_auto_deduct`: POS deducts directly from master inventory.
    - `kitchen_station_auto_deduct`: item is moved/prepped into kitchen station, then POS deducts from kitchen ready stock.
    - `bulk_usage_expense`: opened ingredient used informally by kitchen/bar; quantity is recorded for cost/expense and staff reporting, not exact per-order deduction.
  - Do not rename DB values until every recipe, POS deduct, stock report, usage history, and kitchen station query is migrated.

- `inventory_items.station_scope`
  - Current values: `kitchen`, `barista`, `shared`.
  - Confirm whether `barista` should be renamed to `bar` in UI only or migrated in DB later.
  - Keep `shared` for ingredients usable by both kitchen and barista flows.
  - Staff testing/calibration filters depend on station scope plus staff type.

- `stock_reports.report_type`
  - Values seen in code: `low_stock`, `out_of_stock`, `waste_damaged`, `restock_request`, `testing_usage`, `waste`, `damaged`, `expired`, `kitchen_note`, `stock_check`, `test_food`, `test_drink`, `test_ingredient`.
  - Needs one canonical list before strict DB constraints are added.
  - Current cleanup direction:
    - Keep manager-facing categories clear: low stock, out of stock, restock request, waste/damaged/expired, testing usage, kitchen note.
    - Do not label waste as low stock. Existing old rows should be migrated if their description clearly starts with kitchen waste/report context.
    - Staff My Reports and Manager Stock Report must show notes/description clearly because kitchen reports are informal and note-heavy.

- `stock_reports.station_scope`
  - Used for manager and staff report filtering.
  - Confirm all report creation paths write this field consistently.
  - Required for kitchen/barista/shared report separation.
  - Existing fallback code handles missing schema, but cleanup target is to keep this column and remove fallback after DB is stable.

- `kitchen_station_movements.movement_type`
  - Current values include `transfer_in`, `pos_usage`, `bulk_opened`, `waste`, `closing_count`, `adjustment`, `reversal`.
  - UI should prefer business wording such as opened ingredient, moved to kitchen, POS usage, and waste.
  - `bulk_opened` is the technical value for opened ingredient usage. UI wording should be `Opened Ingredient` or `Ingredient Opened`, not `bulk opened`.
  - `transfer_in` means master/freezer/gudang stock moved into kitchen station.
  - `waste` and `adjustment` are operational inventory movements; they can also create stock reports when staff needs manager review.
  - Keep movement rows as audit/history; do not delete them just because a staff report is resolved.

- `kitchen_station_batches.station_status`
  - Current values include `planned`, `thawing`, `prep`, `ready`, `finished`, `waste`.
  - Confirm whether `finished` means used up, closed, or no longer available.
  - Current business direction: `finished` should mean used up / no longer active in station. Prefer UI wording `Used Up`.
  - `waste` means remaining station quantity is discarded and should be auditable.
  - POS should deduct only from ready station stock for kitchen station auto deduct items.

- `menu_bundles.display_order`
  - UI label is `Menu Position`.
  - Keep DB field name unless a broader menu ordering cleanup happens.
  - Meaning: sort order for bundle cards in customer/menu and owner bundle management.
  - RLS note: owner create/update bundle previously hit `new row violates row-level security policy for table "menu_bundles"`. Cleanup/migration must include insert/update/delete policies for the authenticated owner app role used by the frontend.

- Legacy cost fields
  - `inventory_items.price_per_unit` should not be used by new code unless the column truly exists.
  - Prefer `inventory_items.cost_per_unit` and batch-level `inventory_batches.unit_cost`.
  - Existing owner insight code still has fallbacks to `price_per_unit`; cleanup target is to standardize to `cost_per_unit` and remove `price_per_unit` from new selects/types unless a migration intentionally adds it.

- Order fulfillment timestamps
  - Important fields seen in code: `orders.completed_at`, `order_items.ready_at`, `order_items.served_at`, `order_items.served_by`.
  - Earlier endpoint error showed `orders.ready_at` does not exist. Current cleanup direction: service timing should use item-level `order_items.ready_at` and `order_items.served_at`, while order completion uses `orders.completed_at`.
  - Do not add `orders.ready_at` / `orders.served_at` only to satisfy one query unless the business meaning is order-level rollup. If rollup is needed, define whether it is first item ready, last item ready, first served, or last served.

- Product availability fields
  - Code has used both `available` and `is_available`.
  - Cleanup target: choose one canonical product availability boolean, migrate old rows, then update all product/customer/menu/POS selects.
  - Until migration is complete, do not delete either field without a code audit.

- Staff identity and role fields
  - Canonical role buckets: owner, manager, staff.
  - Staff type buckets: cashier, barista, kitchen, waiter.
  - Status buckets shown in UI: active, inactive, on leave, terminated.
  - Keep staff names, emails, phones, staff codes, shift names, and dates as data values; translate only labels around them.

- Notifications
  - Shared UI modal exists; owner notification logic is generated from live business data, not a separate durable notifications table yet.
  - Owner signals include critical inventory, menu availability risk, report/stock issues, bookkeeping exceptions, and action items.
  - Manager/staff notification work is separate and should be added per actor before creating a permanent notification schema.
  - Customer notifications are currently not needed because customer flow is website-based menu/order/status, not mobile push.

- Testing / calibration usage
  - Staff stock check includes testing usage for ingredient/menu calibration.
  - It should affect COGS/usage history because ingredients are consumed.
  - It should also create staff/manager report visibility when relevant.
  - Technical values seen: `testing_usage`, `test_food`, `test_drink`, `test_ingredient`; consolidate naming before adding strict constraints.

- Usage history vs stock reports
  - `usage_transactions` and usage history are inventory/COGS audit.
  - `stock_reports` are communication/review workflow between staff and manager.
  - Waste, testing, move-to-kitchen, and opened ingredient can appear in usage history; only staff-facing issues or notes should appear in stock reports.
  - Do not treat this as redundant: one answers "what moved/cost changed", the other answers "what staff reported and manager reviewed".

## Owner Translation Status

- Done: navbar labels, role switcher labels, language switcher, notification modal shell, profile modal shell, owner dashboard sidebar.
- Done: owner bookkeeping sidebar, business date filter, primary status/error messages, closings tab, auto ledger tab, cost and margin tab, expenses tab, tax and charge settings, and review queue tab.
- Done: owner staff manager header search/add controls, forms/modals, attendance copy, staff cards, and staff role/status labels.
- Done: owner activity log empty state, stats cards, filters, tables, detail modal, export labels, and toast/status copy.
- Done: owner dashboard tab content for Overview, Sales, Customer Performance, Customer Discounts/Menu Bundles, Inventory, Staff, Operations, including export workbook headers and visible chart/table/modal copy.
- Query audit: owner dashboard Supabase queries keep product names, inventory names, supplier names, staff names, notes, batch numbers, payment methods, order status values, and other user/database values as-is. UI labels, report type labels, status labels, and fallback copy are translated in the frontend.
- Done: owner login and owner profile modal shell.
- Pending for later pass: deeper owner archive/page-specific content and any newly added owner modules after 2026-06-08.

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

## Manager Bilingual Rollout Checklist

Detailed checklist: `docs/bilingual-manager-checklist.md`

Manager bilingual work should be done in batches because manager has the widest operational surface. Do not mix large UI translation changes with schema cleanup in the same commit unless the schema change is required to make labels reliable.

- [ ] Manager shell/navigation sanity check
  - Routes: `frontend/app/manager/layout.tsx`, shared Navbar/Sidebar labels.
  - Notes: navbar labels already use shared `nav.manager.*` keys; confirm page-level titles still use manager keys.

- [ ] Manager profile
  - Route: `frontend/app/manager/profile/page.tsx`.
  - Shared component: `frontend/app/components/shared/profile/ProfileSection.tsx`.
  - Notes: profile shared component has been moved to `profile.*` keys so owner/manager/staff can reuse the same translations.

- [ ] Manager staff manager
  - Route: `frontend/app/manager/staff-manager/page.tsx`.
  - Shared components: `StaffTable`, `StaffCard`, owner staffmanager attendance components if reused.
  - Notes: shared staff card/table have i18n support; manager page-specific headers, copy, modals, and toasts still need audit.

- [ ] Manager order board
  - Route: `frontend/app/manager/order/page.tsx`.
  - Shared components: order cards/status labels/correction flow.
  - Notes: keep database statuses as slugs; translate only UI labels. Do not rename order statuses during i18n.

- [ ] Manager closing
  - Route: `frontend/app/manager/closing/page.tsx`.
  - API: `frontend/app/api/manager/closing/operations/route.ts`.
  - Notes: closing copy must stay operational, not formal accounting language.

- [ ] Manager table management
  - Route: `frontend/app/manager/table-management/page.tsx`.
  - Components: `frontend/app/components/manager/tablemanager/*`.
  - Notes: QR/table/floor labels should be translated; floor/table names from DB stay as data.

- [ ] Manager menu management
  - Route: `frontend/app/manager/menu/page.tsx`.
  - Components: `frontend/app/components/manager/menu/*`.
  - Notes: product/category/variant names from DB stay as user-entered content. UI copy, modal labels, image upload errors, and product availability labels need translation.

- [ ] Manager inventory shell and tabs
  - Route: `frontend/app/manager/inventory/page.tsx`.
  - Components: `frontend/app/components/manager/inventory/*`.
  - Notes: this is the largest batch. Translate tab labels, raw material modals, restock/adjustment/export labels, variants, recipes, stock reports, and usage history. Keep `tracking_mode`, `station_scope`, movement types, and report types as canonical DB values.

- [ ] Manager notifications
  - Files: `frontend/app/components/shared/notifications/useManagerNotifications.ts`.
  - Notes: modal is shared and translated; generated manager notification content still needs a manager-specific translation pass.

## Translation File Maintenance

`frontend/app/components/shared/i18n/translations.ts` is now large enough that future work should avoid uncontrolled growth.

Detailed split plan: `docs/bilingual-manager-checklist.md`

Current short-term rule:

- Keep adding keys to `translations.ts` while finishing manager/staff/customer bilingual rollout to avoid risky refactors mid-feature.
- Use namespaced keys such as `manager.inventory.*`, `manager.menu.*`, `manager.order.*`, `manager.table.*`, `manager.closing.*`, and `manager.staff.*`.
- Reuse shared keys first: `common.*`, `dateRange.*`, `profile.*`, `stockReport.*`, `notifications.*`, `owner.staff.*` only when the concept is truly shared staff-domain language.

Cleanup target after bilingual rollout:

- Split dictionaries by domain, for example:
  - `translations/common.ts`
  - `translations/navigation.ts`
  - `translations/owner.ts`
  - `translations/manager.ts`
  - `translations/staff.ts`
  - `translations/customer.ts`
- Compose them in one exported object so `LanguageProvider` API stays unchanged.
- Add a duplicate-key validation script/check before database cleanup and before thesis screenshots.
- Keep Supabase enum values out of translation files unless they are mapped through domain label helpers.

## Cleanup Principle

When a field has both business meaning and technical meaning, keep the technical value stable in Supabase and create a UI label map. This keeps reports, filters, API queries, and historical rows safe while still allowing bilingual internal screens.

## Pre-Cleanup Checklist

- Run a code search for every column planned for deletion.
- Export or snapshot affected Supabase tables before migration.
- Add missing RLS policies before testing owner bundle create/update/delete.
- Normalize `stock_reports.report_type` historical rows where waste/testing/kitchen note rows were stored as `low_stock`.
- Decide final product availability field: `available` vs `is_available`.
- Decide whether order-level ready/served timestamps are needed; if not, keep timing at `order_items`.
- Standardize cost source to `inventory_items.cost_per_unit` plus `inventory_batches.unit_cost`.
- Keep `stock_reports.station_scope`; remove frontend fallbacks only after deployed schema is stable.
- Confirm all kitchen actions create the right records:
  - Move to kitchen: kitchen station batch + kitchen movement + usage history/audit as needed.
  - Opened ingredient: kitchen movement + cost/usage audit.
  - Report: stock report with station, notes, condition/level context.
  - Mark used up: movement/adjustment and inactive/finished state.
  - Mark waste: movement/waste and stock report if manager review is needed.
- Re-run TypeScript/lint checks for files touched by schema cleanup.
