# Staff Operations Refactor - Handoff and Implementation Baseline

Last updated: 2026-06-23  
Project root: `D:\iza-pos-v2`  
Frontend root: `D:\iza-pos-v2\frontend`

## 1. Purpose of this document

This document is the source of truth for the planned staff operations refactor.
It is intentionally written so another Codex session or another AI agent can
continue the work without reading the original brainstorming conversation.

The work must be implemented feature by feature. After every feature:

1. Verify the existing coffee-shop flow is not made harder.
2. Run lint and relevant checks.
3. Test the affected role combinations.
4. Review the UX with the user.
5. Revise before continuing.

Do not implement the entire refactor in one large change.

## 2. Product principle that overrides every technical proposal

> The system must follow the coffee shop's existing workflow. Staff must not
> be forced to perform extra digital administration merely to produce data for
> the owner dashboard.

Rules derived from this principle:

- The happy path must be automatic or require no more actions than the current
  workflow.
- Manual assignment, reassignment, and correction are exception tools, not
  mandatory rituals.
- Do not require baristas or waiters to repeatedly open a phone while working.
- Do not collect individual performance data when collecting it would slow
  operations.
- Prefer smaller but truthful datasets over complete-looking but misleading
  analytics.
- Schedule data must help planning, but an incomplete schedule must not block
  daily operations.
- Attendance represents who is actually present and is the primary source for
  operational availability.

## 3. Business context

The system must support at least these two observed coffee-shop structures.

### Coffee shop A

- Cashier, barista, kitchen, and waiter/server are separate positions.
- Kitchen is physically separated and needs its own digital queue.
- Waiter physically carries orders but does not need an operational app page.

### Coffee shop B

- No dedicated waiter.
- A staff member may work as both cashier and barista.
- Staff roles/positions cannot remain mutually exclusive.

This is why the application needs multi-position staff without becoming a
fully custom permission builder.

## 4. Final role and workflow model

### 4.1 System roles

System authentication roles remain:

- `owner`
- `manager`
- `staff`

### 4.2 Operational positions

Operational positions remain fixed presets:

- `cashier`
- `barista`
- `kitchen`
- `waiter`

A staff account may have one or more operational positions.

### 4.3 Digital responsibility

| Position | Required digital access |
| --- | --- |
| Cashier | POS, Order, Attendance, Profile |
| Barista | Stock Check for bar, Attendance, Profile |
| Kitchen | Kitchen Queue, Stock Check for kitchen, Attendance, Profile |
| Waiter | Attendance, Profile |

Access is the union of all positions owned by a staff member.

Examples:

- Cashier + Barista: POS, Order, Bar Stock Check, Attendance.
- Barista + Kitchen: Kitchen Queue, Bar/Kitchen Stock Check, Attendance.
- Waiter only: Attendance.

Do not create `/staff/bar` or `/staff/service`.

## 5. Final operational flow

### 5.1 Cashier is the main digital operator

The cashier handles:

- Creating POS orders.
- Monitoring POS and QR orders.
- Moving new orders into processing.
- Optional barista attribution when it can be done without friction.
- Recording handoff/fulfillment when needed.

### 5.2 Kitchen remains a shared digital station

Kitchen has `/staff/kitchen` because it is a separate physical station.

- Kitchen items enter a shared queue.
- Cashier does not assign a kitchen worker.
- Any eligible kitchen staff may process the queue.
- Kitchen staff can mark kitchen items as cooking and ready.
- Existing `cooking_started_at`, `ready_at`, and `ready_by` fields should be
  used when the kitchen workflow is updated.

### 5.3 Barista remains an offline physical workflow

Baristas do not need to:

- Open an order queue.
- Accept an assignment.
- Press start.
- Press ready.

Optional barista attribution is metadata recorded by the cashier. It must not
become a required step before an order can be processed.

Consequences:

- Do not claim exact bar preparation duration.
- An assigned barista means "attributed/expected handler", not proof of who
  physically completed every drink.
- If attribution is omitted, the order must still proceed normally.

### 5.4 Waiter remains an offline physical workflow

Waiters do not need:

- Order Page.
- Service Queue.
- Order notifications.
- A serve/deliver button.

If waiter attribution is retained:

- Cashier records it.
- It should be optional unless there is a very low-friction auto-selection.
- The timestamp represents system-recorded handoff, not verified arrival at
  the customer's table.
- Reports must not call this "delivery time to table".

### 5.5 Counter pickup

Counter pickup must never require a waiter selection.

Use wording such as:

- `Handed to Customer`
- `Fulfilled at Counter`

Do not reuse table-service analytics without checking
`orders.fulfillment_method`.

## 6. UX constraints

Every proposed UI change must pass these tests:

1. Can the system infer this automatically?
2. Is this required for the coffee shop to operate, or only useful for a
   report?
3. Can the action be skipped without blocking the order?
4. Does a shift change require extra reassignment?
5. Does a staff member need to understand internal system concepts to finish
   ordinary work?

Rejected UX patterns:

- Mandatory reassignment when shifts change.
- Selecting a kitchen worker for every order.
- Selecting a waiter for counter pickup.
- Selecting staff for every individual drink.
- Requiring a role switch or second login for multi-position staff.
- Requiring weekly schedule completeness before staff can work.
- Requiring baristas or waiters to confirm routine physical actions.

Preferred patterns:

- Auto-select when there is exactly one eligible staff member.
- Remember the last optional choice within a shift.
- Attribute once per order/station instead of once per item in the UI.
- Store item-level attribution only when required for database consistency.
- Keep `Change` or correction actions available but visually secondary.

## 7. Verified current code behavior

The following behavior was verified from the repository.

### 7.1 Single-position access

Current access is based on one `staff.staff_type`.

Main files:

- `frontend/lib/utils/auth.ts`
- `frontend/lib/utils/staffAccess.ts`
- `frontend/app/staff/layout.tsx`
- `frontend/app/components/ui/Navigation/Navbar/index.tsx`

`staff_type` is also stored in local storage and returned by login/session
routes.

### 7.2 Current staff home paths

Current defaults in `frontend/lib/utils/staffAccess.ts`:

- Cashier → `/staff/pos`
- Waiter → `/staff/order`
- Barista → `/staff/order`
- Kitchen → `/staff/kitchen`

This must eventually change so Order is cashier-only and waiter/barista do not
land on Order.

### 7.3 Current Order permissions

`canUpdateStaffOrders()` currently allows cashier and waiter to update orders.

This permission is too broad because it combines different actions:

- Processing a new order.
- Marking items served.

Future access utilities must be capability-oriented, for example:

- `canAccessPos`
- `canAccessOrder`
- `canAccessKitchen`
- `canAccessStockCheck`
- `canAccessKitchenStation`

Do not build a custom owner-managed permission table in the first iteration.
Capabilities should be derived from fixed positions.

### 7.4 Current Stock Check behavior

`frontend/app/staff/stock-check/page.tsx` already separates inventory using:

- `station_scope = barista`
- `station_scope = kitchen`
- `station_scope = shared`

Kitchen has extra Kitchen Station and Opened Ingredients workflows.

For Barista + Kitchen staff, retain one Stock Check route and add an explicit
station context:

- Bar context: barista + shared.
- Kitchen context: kitchen + shared, Kitchen Station, Opened Ingredients.

Do not duplicate the page.

### 7.5 Current order preparation routing

`categories.preparation_station` already exists and is used by POS order
creation.

Verified values in current data:

- `bar`
- `kitchen`

This field should remain the source of truth for station routing.

## 8. Verified Supabase baseline

The Supabase project was inspected directly in read-only mode using its
PostgREST OpenAPI metadata and count/read requests. No database data was
changed.

### 8.1 Relevant record counts at audit time

| Table | Rows |
| --- | ---: |
| staff | 7 |
| orders | 171 |
| order_items | 260 |
| attendance | 4 |
| shifts | 2 |
| staff_shift_weekly_assignments | 2 |
| staff_shift_daily_assignments | 2 |
| stock_reports | 7 |
| kitchen_station_batches | 2 |
| kitchen_station_movements | 32 |
| kitchen_station_shift_counts | 1 |

These counts are a snapshot from 2026-06-23 and may change.

### 8.2 Staff distribution at audit time

- 1 active cashier.
- 1 active waiter.
- 1 active barista.
- 1 active kitchen staff.
- 1 active manager.
- 1 inactive manager.
- 1 active owner.

Four of seven staff records had `shift_id`; three did not.

### 8.3 Order distribution at audit time

- 106 completed.
- 59 served.
- 1 partially served.
- 1 preparing.
- 3 new.
- 1 cancelled.
- 101 counter pickup.
- 70 table service.

164 orders had `created_by`; 7 did not.

### 8.4 Order-item data quality

- 118 items: `kitchen_status = ready`, `served = true`.
- 38 items: `kitchen_status = not_required`, `served = true`.
- 104 items: `kitchen_status = not_required`, `served = false`.
- 156 items had `served_at`.
- 156 items had `served_by`.
- 118 items had `ready_at`.
- 0 items had `ready_by`.
- 0 items had `cooking_started_at`.
- No served item was missing `served_at` or `served_by`.

Important consequence:

`not_required` cannot safely be interpreted as "ready to serve". Most
unserved items in the current data use that value, likely including bar items.

Do not expose a Service Queue based on `not_required`.

### 8.5 Existing fields to reuse

`order_items` already has:

- `kitchen_status`
- `cooking_started_at`
- `ready_at`
- `ready_by`
- `served`
- `served_at`
- `served_by`

`categories` already has:

- `preparation_station`

Existing shift/attendance structure:

- `shifts`
- `staff.shift_id`
- `staff_shift_weekly_assignments`
- `staff_shift_daily_assignments`
- `attendance.shift_id`

### 8.6 Empty or apparently unused tables

At audit time these tables were empty and had no direct application
references found:

- `attendance_requests`
- `default_modifiers`
- `pos_sessions`
- `presensi_shift`
- `product_recipe_overrides`
- `staff_shifts`

`archives` had 7 rows but no direct application reference was found.

Do not delete these yet. OpenAPI metadata does not reveal all PostgreSQL
triggers, functions, policies, views, or indirect dependencies. A database
catalog dependency audit is mandatory before deletion.

### 8.7 Existing empty audit columns

Verified empty at audit time:

- `order_items.ready_by`
- `order_items.cooking_started_at`
- `order_items.served_by_role`
- `order_items.served_by_code`
- `orders.completed_by`
- `orders.served_by_roles`
- `orders.served_by_staff_codes`

These are cleanup/reuse candidates, not immediate deletion targets.

## 9. Decisions already made

These decisions should not be reopened unless testing proves them harmful:

1. Implement feature by feature.
2. Cashier is the primary digital operator.
3. Kitchen keeps a separate shared queue.
4. Kitchen is not assigned by the cashier.
5. Barista does not operate an order queue.
6. Waiter does not operate an order/service page.
7. Do not create `/staff/bar`.
8. Do not create `/staff/service`.
9. Order Page becomes cashier-only for staff accounts.
10. Attendance remains available to every staff account.
11. One staff account may have multiple fixed operational positions.
12. Stock Check remains one route with station context.
13. Weekly schedule supports planning; attendance determines actual
    availability.
14. No reassignment is required merely because the shift changes.
15. Manual corrections must remain possible but secondary.

## 10. Decisions deliberately not finalized

Do not silently guess these during implementation. Resolve them while building
the relevant feature with the user.

### 10.1 Barista attribution

Open question:

- Should cashier attribution be removed entirely, optional, or auto-selected?

Current recommendation:

- Optional metadata.
- Never block `Process`.
- Do not claim exact barista completion or preparation time from assignment.

### 10.2 Waiter attribution

Open question:

- Is selecting a waiter useful enough to justify any cashier interaction?

Current recommendation:

- Optional for table service.
- Auto-select only when exactly one eligible waiter is clocked in.
- Never required for counter pickup.
- Timestamp means recorded handoff, not arrival at table.

### 10.3 Bar-item status lifecycle

Because baristas do not press buttons, exact `ready_at` is unknowable unless
cashier adds another action. Do not invent timestamps.

Possible options for the later Order feature:

- Keep bar items under order-level `preparing` until handoff.
- Add a lightweight cashier action only if user testing accepts it.
- Avoid bar preparation-time analytics.

### 10.4 Primary position

`staff_positions.is_primary` may be useful for:

- Default landing route.
- Profile label.
- Default Stock Check context.

If implemented, enforce at most one primary position per staff. Do not use it
to restrict other owned-position access.

## 11. Target database direction

This section is a proposal for later features, not a migration to execute in
Stage 1.

### 11.1 Multi-position table

Proposed table:

```text
staff_positions
---------------
id uuid primary key
staff_id uuid not null references staff(id)
position text not null
is_primary boolean not null default false
is_active boolean not null default true
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Required constraints:

- Unique `(staff_id, position)`.
- Position limited to `cashier`, `barista`, `kitchen`, `waiter`.
- At most one active primary position per staff.

Transition:

1. Create table.
2. Backfill current `staff.staff_type`.
3. Dual-read only for a bounded migration period.
4. Move every reader and writer to `staff_positions`.
5. Search all `staff_type` references.
6. Remove `staff.staff_type` only after application references and old session
   compatibility are gone.

Do not keep `staff_type` and `staff_positions` as permanent competing sources
of truth.

### 11.2 Order attribution columns

Potential optional columns:

```text
order_items.assigned_barista_id
order_items.assigned_barista_by
order_items.assigned_barista_at
order_items.served_recorded_by
```

These columns must not be added until the Order coordination UX is finalized.
Every new column must have an actual writer, reader, report meaning, and
cleanup policy.

## 12. Ten feature stages

### Stage 1 - Baseline and handoff documentation

Status: this document.

Deliverables:

- Product decisions.
- Verified current behavior.
- Supabase baseline.
- UX guardrails.
- Impact map.
- Testing matrix.
- Cleanup rules.

No production behavior or database schema is changed in this stage.

### Stage 2 - Multi-position staff

Goals:

- Add `staff_positions`.
- Backfill existing `staff_type`.
- Update Add/Edit Staff UI for multiple positions.
- Display multiple position badges.

Primary areas:

- `frontend/app/owner/staff-manager/page.tsx`
- `frontend/app/components/owner/staffmanager/AddStaffModal.tsx`
- `frontend/app/components/owner/staffmanager/EditStaffModal.tsx`
- `frontend/app/components/shared/StaffTable.tsx`
- `frontend/app/components/shared/StaffCard.tsx`
- `frontend/app/api/staff/add/route.ts`

Review point:

- Owner can create/edit single- and multi-position staff without confusion.

### Stage 3 - Session and access

Goals:

- Session carries a position array.
- Access is derived from the union of positions.
- Order is cashier-only.
- Waiter has Attendance/Profile only.

Primary areas:

- `frontend/lib/utils/auth.ts`
- `frontend/lib/auth/internalSession.ts`
- `frontend/lib/utils/staffAccess.ts`
- `frontend/middleware.ts`
- `frontend/app/api/internal-session/route.ts`
- `frontend/app/api/staff/login/route.ts`
- `frontend/app/staff/login/page.tsx`
- `frontend/app/staff/layout.tsx`
- `frontend/app/staff/page.tsx`
- `frontend/app/components/shared/auth/RoleGuard.tsx`
- `frontend/app/components/ui/Navigation/Navbar/index.tsx`

Review point:

- Every position combination lands on a sensible page and sees no irrelevant
  mandatory workflow.

### Stage 4 - Stock Check multi-station context

Goals:

- Keep one Stock Check route.
- Add Bar/Kitchen context for dual-position staff.
- Preserve Kitchen Station/Open Ingredients only in Kitchen context.
- Prevent shared inventory duplication.

Primary areas:

- `frontend/app/staff/stock-check/page.tsx`
- New components may be placed under
  `frontend/app/components/staff/stock-check/`.

Review point:

- Barista + Kitchen staff can understand and switch context without a role
  switch or second login.

### Stage 5 - Weekly scheduling

Goals:

- Provide a clear Monday–Sunday, per-shift schedule.
- Keep weekly assignments as the recurring plan.
- Keep daily assignments as date-specific overrides.
- Do not block operations when schedule data is incomplete.

Primary areas:

- `frontend/app/owner/staff-manager/page.tsx`
- `frontend/app/components/owner/staffmanager/AttendanceSection.tsx`
- `frontend/app/api/owner/staff-manager/weekly-shifts/route.ts`
- Existing shift-closing and bookkeeping routes that read weekly/daily
  assignments.

Open cleanup question:

- Final role of `staff.shift_id` after weekly scheduling becomes authoritative.

Review point:

- Shift changes do not require order reassignment or staff role switching.

### Stage 6 - Available staff source

Goals:

- Centralize "currently available staff" logic.
- Primary eligibility: active staff + owned position + clocked in + not clocked
  out.
- Schedule may add context/warnings but must not hard-block substitutes.

Potential API:

- `frontend/app/api/staff/available/route.ts`

Potential reusable library:

- `frontend/lib/staff/availability.ts`

Review point:

- A replacement staff member can work even when the weekly plan was not
  updated.

### Stage 7 - Order station routing

Goals:

- Keep `categories.preparation_station` as the source of truth.
- Kitchen items enter Kitchen Queue.
- Bar items remain an offline bar workflow.
- Stop creating new ambiguous bar items as "ready" merely because kitchen is
  not required.

Primary areas:

- `frontend/app/staff/pos/page.tsx`
- `frontend/app/customer/menu/checkout/page.tsx`
- `frontend/app/staff/kitchen/page.tsx`
- Shared order types/constants.

Review point:

- POS and QR orders route correctly without cashier duplicating work.

### Stage 8 - Cashier Order coordination

Goals:

- Make staff Order Page cashier-only.
- Keep `Process` fast.
- Optional attribution must never block processing.
- Kitchen remains unassigned.

Primary areas:

- `frontend/app/staff/order/page.tsx`
- `frontend/app/components/shared/OrderCard.tsx`
- `frontend/app/components/staff/order/OrderTable.tsx`
- `frontend/app/components/staff/order/TableOrderMapView.tsx`
- Potential `frontend/app/api/orders/process/route.ts`

Review point:

- Cashier can process a normal order with the same or fewer meaningful
  interactions than before.

### Stage 9 - Handoff/fulfillment

Goals:

- Use truthful terminology.
- Table service may optionally record waiter handoff.
- Counter pickup never asks for waiter.
- Mixed orders remain item-aware.

Primary areas:

- `frontend/app/staff/order/page.tsx`
- `frontend/app/components/shared/OrderCard.tsx`
- Potential `frontend/app/api/orders/serve/route.ts`
- Order reporting and presentation helpers.

Review point:

- Cashier is not forced to select a person for every item or every routine
  handoff.

### Stage 10 - Reporting, notifications, cleanup

Goals:

- Remove waiter order notifications.
- Remove barista drink-queue notifications if no bar workflow exists.
- Show multiple positions in profile, attendance, and reports.
- Ensure analytics make only supported claims.
- Audit and remove truly unused code/schema.

Primary areas:

- `frontend/app/components/shared/notifications/useStaffNotifications.ts`
- `frontend/app/components/shared/profile/ProfileSection.tsx`
- `frontend/app/components/shared/profile/ProfileModal.tsx`
- `frontend/app/staff/attendance/page.tsx`
- `frontend/app/components/owner/staffmanager/AttendanceSection.tsx`
- `frontend/app/components/owner/business-dashboard/tabs/staff/StaffDashboard.tsx`
- `frontend/app/components/owner/business-dashboard/tabs/operations/OperationDashboard.tsx`
- Owner insight snapshot builders.

Review point:

- Dashboard labels describe attribution/handoff accurately and do not imply
  measurements the application never captured.

## 13. Detailed file impact map

### Authentication and identity

- `frontend/lib/utils/auth.ts`
- `frontend/lib/auth/internalSession.ts`
- `frontend/app/api/internal-session/route.ts`
- `frontend/app/api/staff/login/route.ts`
- `frontend/app/api/owner/login/route.ts`
- `frontend/app/api/manager/login/route.ts`
- `frontend/app/staff/login/page.tsx`
- `frontend/app/owner/login/page.tsx`
- `frontend/app/manager/login/page.tsx`
- `frontend/middleware.ts`

### Access and navigation

- `frontend/lib/utils/staffAccess.ts`
- `frontend/app/staff/layout.tsx`
- `frontend/app/staff/page.tsx`
- `frontend/app/components/shared/auth/RoleGuard.tsx`
- `frontend/app/components/ui/Navigation/Navbar/index.tsx`
- `frontend/app/components/shared/i18n/translations/common.ts`

### Staff management

- `frontend/app/owner/staff-manager/page.tsx`
- `frontend/app/manager/staff-manager/page.tsx`
- `frontend/app/components/owner/staffmanager/AddStaffModal.tsx`
- `frontend/app/components/owner/staffmanager/EditStaffModal.tsx`
- `frontend/app/components/owner/staffmanager/AttendanceSection.tsx`
- `frontend/app/components/shared/StaffTable.tsx`
- `frontend/app/components/shared/StaffCard.tsx`
- `frontend/app/api/staff/add/route.ts`
- `frontend/app/api/owner/staff-manager/weekly-shifts/route.ts`

### Staff operational pages

- `frontend/app/staff/pos/page.tsx`
- `frontend/app/staff/order/page.tsx`
- `frontend/app/staff/kitchen/page.tsx`
- `frontend/app/staff/stock-check/page.tsx`
- `frontend/app/staff/attendance/page.tsx`
- `frontend/app/staff/profile/page.tsx`

### Order UI and domain

- `frontend/app/components/shared/OrderCard.tsx`
- `frontend/app/components/staff/order/OrderTable.tsx`
- `frontend/app/components/staff/order/TableOrderMapView.tsx`
- `frontend/lib/types/common.ts`
- `frontend/lib/constants/orders.ts`
- `frontend/lib/orders/orderPresentation.ts`
- `frontend/lib/orders/orderCorrection.ts`

### Customer QR ordering

- `frontend/app/customer/menu/checkout/page.tsx`
- Related table-session/customer validation APIs only if routing behavior
  requires it.

### Notifications and profile

- `frontend/app/components/shared/notifications/useStaffNotifications.ts`
- `frontend/app/components/shared/notifications/types.ts`
- `frontend/app/components/shared/profile/ProfileSection.tsx`
- `frontend/app/components/shared/profile/ProfileModal.tsx`

### Owner analytics

- `frontend/app/components/owner/business-dashboard/tabs/staff/StaffDashboard.tsx`
- `frontend/app/components/owner/business-dashboard/tabs/operations/OperationDashboard.tsx`
- `frontend/app/components/owner/business-dashboard/tabs/shared/useOwnerDashboardData.ts`
- `frontend/lib/services/owner-insights/snapshots/staffSnapshotBuilder.ts`
- `frontend/lib/services/owner-insights/snapshots/operationsSnapshotBuilder.ts`

### Shift/bookkeeping consumers

- `frontend/app/api/staff/bookkeeping/shift-closing/route.ts`
- `frontend/app/api/manager/closing/operations/route.ts`
- `frontend/app/api/owner/bookkeeping/shift-assignments/route.ts`

## 14. Proposed folder organization

Create folders only when the relevant feature is implemented. Do not create
empty architecture placeholders.

Suggested target:

```text
frontend/
├── app/
│   ├── api/
│   │   ├── orders/
│   │   │   ├── process/route.ts
│   │   │   └── serve/route.ts
│   │   └── staff/
│   │       └── available/route.ts
│   ├── components/
│   │   ├── owner/staffmanager/
│   │   └── staff/
│   │       ├── order/
│   │       └── stock-check/
│   └── staff/
│       ├── attendance/
│       ├── kitchen/
│       ├── order/
│       ├── pos/
│       └── stock-check/
├── docs/
│   └── STAFF_OPERATIONS_REFACTOR_HANDOFF.md
└── lib/
    ├── auth/
    ├── orders/
    └── staff/
        ├── access.ts
        ├── availability.ts
        ├── positions.ts
        └── types.ts
```

Before moving existing utility files, inspect import volume and avoid
unnecessary rename churn. A clean folder tree is not worth destabilizing
working code.

## 15. Cleanup policy

Nothing is deleted merely because it is empty or currently unreferenced.

Before deleting a database table/column:

1. Search application references.
2. Inspect foreign keys.
3. Inspect PostgreSQL views/materialized views.
4. Inspect triggers.
5. Inspect functions/RPCs.
6. Inspect RLS policies.
7. Inspect scheduled jobs/Edge Functions if present.
8. Confirm whether historical data must be archived.
9. Create a reversible migration or backup.
10. Verify production behavior after removal.

Before deleting a code file:

1. Search imports and dynamic references.
2. Check route conventions.
3. Run lint/type-check/build as appropriate.
4. Test the affected workflow.

Known cleanup candidates, not yet approved for deletion:

- `attendance_requests`
- `default_modifiers`
- `pos_sessions`
- `presensi_shift`
- `product_recipe_overrides`
- `staff_shifts`
- `archives`
- Empty/unused audit columns listed in section 8.7
- Legacy `staff.staff_type` after migration completion
- Legacy `staff.shift_id` after shift source-of-truth is finalized

## 16. Required test matrix

### Position/access scenarios

- Cashier only.
- Barista only.
- Kitchen only.
- Waiter only.
- Cashier + Barista.
- Barista + Kitchen.
- Cashier + Kitchen.
- Waiter + another position.
- Owner accessing staff pages.
- Manager staff-management access.

### Order scenarios

- POS counter-pickup order.
- POS table-service order.
- QR table order.
- Bar-only order.
- Kitchen-only order.
- Mixed bar + kitchen order.
- Partial item handoff while kitchen item is not ready.
- Kitchen item ready.
- Counter pickup without waiter.
- Table service with waiter attribution omitted.
- Table service with waiter attribution recorded.
- Shift changes while an order remains active.

### Attendance/schedule scenarios

- Scheduled and clocked-in.
- Scheduled but absent.
- Not scheduled but clocked-in as a replacement.
- Weekly schedule.
- Daily override.
- Incomplete schedule.
- Multi-position staff clock-in.

### Stock scenarios

- Barista sees bar + shared stock.
- Kitchen sees kitchen + shared stock.
- Barista + Kitchen switches contexts.
- Shared stock is not duplicated.
- Kitchen Station hidden in Bar context.
- Kitchen Station works in Kitchen context.

## 17. Verification commands

Run from `frontend` unless noted otherwise:

```text
npm run lint
npx tsc --noEmit
npm run build
```

Repository searches after migration:

```text
rg -n "staff_type" frontend
rg -n "staffType" frontend
rg -n "waiter.*order|order.*waiter" frontend
rg -n "not_required" frontend
rg -n "staff_shifts|presensi_shift|attendance_requests" frontend
```

Do not interpret an existing unrelated lint/build failure as caused by the
current feature. Record baseline failures before implementation and compare
afterward.

## 18. Current worktree warning

At the time this document was created, the repository already had modified and
untracked files, including Order, POS, attendance, and shared component work.

Future agents must:

- Run `git status --short` before editing.
- Treat existing changes as user-owned.
- Avoid reverting or overwriting unrelated changes.
- Inspect overlapping diffs before modifying a dirty file.

## 19. Stage completion template

Append a short entry here or in a dedicated stage document after every stage:

```text
Stage:
Status:
Date:

Implemented:
- ...

Database changes:
- ...

Files changed:
- ...

UX decisions:
- ...

Verification:
- lint:
- type-check:
- build:
- manual scenarios:

Known limitations:
- ...

Cleanup deferred:
- ...

Next stage:
- ...
```

## 20. Stage 1 completion record

Stage: 1 - Baseline and handoff documentation  
Status: Completed  
Date: 2026-06-23

Implemented:

- Added this handoff document.
- Recorded verified current code behavior.
- Recorded read-only Supabase findings.
- Defined product and UX guardrails.
- Defined the ten-stage delivery sequence.
- Defined impact, cleanup, and test checklists.

Database changes:

- None.

Production code changes:

- None.

Next stage:

- Stage 2 - Multi-position staff.
- Before implementation, inspect the current dirty diffs in all overlapping
  Staff Manager and authentication files.

## 21. Stage 2 implementation record

Stage: 2 - Multi-position staff  
Status: Completed and user-tested  
Date: 2026-06-23

Implemented:

- Added `staff_positions` migration with fixed-position constraint, one-primary
  constraint, backfill from `staff.staff_type`, and cascade deletion.
- Added `set_staff_positions` RPC to keep position rows and the temporary
  compatibility column `staff.staff_type` synchronized.
- Added centralized position normalization, labels, primary resolution, and
  legacy fallback helpers.
- Updated Owner Staff Manager reads to include position rows with a temporary
  fallback to legacy `staff_type` when the migration is unavailable.
- Updated Add Staff and Edit Staff forms to support multiple positions and one
  primary position.
- Updated Staff Card and Staff Table to render multiple position badges.
- Revised Staff Card so operational staff show position badges only; the
  redundant `Staff`/`Management` badges are not shown together with positions.
- Position badges are ordered with the primary position first in both Card and
  Table views.
- Updated Manager Staff Manager read-only lists to show multiple positions.
- Preserved `staff_type` as the primary-position compatibility value for
  stages that have not yet migrated to position arrays.

Database migration:

- File:
  `frontend/supabase/migrations/202606230001_create_staff_positions.sql`
- Live Supabase verification after user applied the SQL:
  - `staff_positions` table: present.
  - `set_staff_positions` RPC: present.
  - Four existing operational staff rows were backfilled.
  - Anonymous frontend reads and nested staff-position reads succeed.
  - Direct anonymous RPC writes returned 401, so position writes were moved to
    an owner-only server API using the service-role client.

Files changed:

- `frontend/supabase/migrations/202606230001_create_staff_positions.sql`
- `frontend/lib/staff/positions.ts`
- `frontend/app/owner/staff-manager/page.tsx`
- `frontend/app/api/owner/staff-manager/positions/route.ts`
- `frontend/app/manager/staff-manager/page.tsx`
- `frontend/app/components/owner/staffmanager/AddStaffModal.tsx`
- `frontend/app/components/owner/staffmanager/EditStaffModal.tsx`
- `frontend/app/components/shared/StaffTable.tsx`
- `frontend/app/components/shared/StaffCard.tsx`

Verification:

- Targeted ESLint for all Stage 2 TypeScript/TSX files: passed.
- `git diff --check` for Stage 2 files: passed.
- Full-project ESLint: blocked by 30 pre-existing errors outside Stage 2.
- Full-project TypeScript: blocked by pre-existing `.next`, route signature,
  VariantSidebar, inventory, dashboard query, and report-export errors.
- No Stage 2 file appeared in the TypeScript error output.

User acceptance:

- Creating and editing multi-position staff succeeded.
- Position selections persisted when reopening Edit Staff.
- Staff Card badges reflected all selected positions.
- Primary-position badge ordering was corrected and accepted.

Next stage:

- Stage 3 - Session and access.

## 22. Stage 3 implementation record

Stage: 3 - Session and access  
Status: Implemented; manual role-combination testing required  
Date: 2026-06-23

Implemented:

- Staff login and internal-session responses now include all active positions
  plus the primary position.
- The signed internal session carries `staffPositions`; old cookies still
  fall back to the legacy single `staffType`.
- Browser identity storage now persists `staff_positions` as a JSON array and
  keeps `staff_type` only as the primary-position compatibility value.
- Staff access is derived from the union of active positions.
- Staff Order and POS access are cashier-only.
- Kitchen Queue is kitchen-only.
- Stock Check is available to barista or kitchen positions.
- Attendance and Profile remain available to every operational staff account.
- Waiter-only staff land on Attendance and do not receive an Order menu.
- Multi-position navbar menus are merged and duplicate routes are removed.
- Page-level guards for POS, Order, Kitchen, and Stock Check use the full
  position array instead of only `staff_type`.
- Profile summary and profile modal show all operational positions.

Default landing priority:

1. Cashier -> POS.
2. Kitchen -> Kitchen Queue.
3. Barista -> Stock Check.
4. Waiter or no operational page -> Attendance.

This priority selects only the first page after login; it does not restrict
access granted by the staff member's other positions.

Files changed:

- `frontend/lib/utils/auth.ts`
- `frontend/lib/auth/internalSession.ts`
- `frontend/lib/utils/staffAccess.ts`
- `frontend/app/api/staff/login/route.ts`
- `frontend/app/api/internal-session/route.ts`
- `frontend/app/components/shared/auth/RoleGuard.tsx`
- `frontend/app/staff/login/page.tsx`
- `frontend/app/staff/layout.tsx`
- `frontend/app/staff/page.tsx`
- `frontend/app/staff/pos/page.tsx`
- `frontend/app/staff/order/page.tsx`
- `frontend/app/staff/kitchen/page.tsx`
- `frontend/app/staff/stock-check/page.tsx`
- `frontend/app/components/ui/Navigation/Navbar/index.tsx`
- `frontend/app/components/shared/profile/ProfileSection.tsx`
- `frontend/app/components/shared/profile/ProfileModal.tsx`

Verification:

- Targeted ESLint: passed with no errors; existing hook/image warnings remain.
- Full TypeScript check: Stage 3 files have no errors.
- Full TypeScript check remains blocked by pre-existing `.next` generated
  routes, route signatures, dashboard query typing, `VariantSidebar`,
  inventory service, and report-export errors.

Manual test matrix before Stage 4:

1. Log out and log back in so a new multi-position session cookie is issued.
2. Cashier only: POS, Order, Attendance; no Kitchen or Stock Check.
3. Barista only: Stock Check, Attendance; no POS, Order, or Kitchen.
4. Kitchen only: Kitchen, Stock Check, Attendance; no POS or Order.
5. Waiter only: Attendance only, plus Profile through the profile menu.
6. Cashier + Barista: POS, Order, Stock Check, Attendance.
7. Barista + Kitchen: Kitchen, Stock Check, Attendance.
8. Cashier + Kitchen: POS, Order, Kitchen, Stock Check, Attendance.
9. Enter a disallowed URL directly and verify redirection to the appropriate
   staff home page.

Known limitation:

- A Barista + Kitchen staff member can access Stock Check, but the page still
  derives its detailed station view from one primary position. Stage 4 will
  add an explicit Bar/Kitchen context selector without requiring role
  switching or a second login.

Next stage:

- Stage 4 - Stock Check multi-station context.

## 23. Stage 4 implementation record

Stage: 4 - Stock Check multi-station access  
Status: Completed and user-tested  
Date: 2026-06-23

Implemented:

- Stock Check access uses the complete position array.
- Barista sees `barista + shared` inventory.
- Kitchen sees `kitchen + shared` inventory.
- Barista + Kitchen sees `barista + kitchen + shared` inventory in one table.
- Kitchen Station is rendered and loaded only when the account owns the
  Kitchen position.
- Cashier + Barista no longer sees Kitchen Station or Kitchen inventory.
- A four-position staff account was tested and all applicable menus appeared.

UX decision:

- The planned Bar/Kitchen context switch was not added. User testing preferred
  one combined Stock Check table containing every station owned by the staff
  plus shared inventory. This avoids another role/context switch.

Verification:

- Targeted ESLint: passed.
- `git diff --check`: passed.
- User acceptance test: passed.

Next stage:

- Stage 5 - Weekly scheduling.

## 24. Stage 5 implementation record

Stage: 5 - Weekly scheduling  
Status: Implemented; revised; user acceptance testing required  
Date: 2026-06-23; revised 2026-06-24

Implemented:

- Added a Monday-Sunday roster under Staff Manager > Attendance Settings,
  below Shift Management. The previous separate `Weekly Schedule` child tab was
  removed.
- Added a Monday-Sunday schedule matrix with one row per active staff or
  manager.
- Each day may use the staff member's default shift or a specific weekly
  shift.
- Schedule changes are saved per staff using the existing
  `staff_shift_weekly_assignments` table.
- The Edit Staff modal now always shows all seven weekdays instead of the
  previous add/remove override UI.
- Updating a weekly schedule no longer deletes date-specific daily overrides.
- Shift resolution priority is now:
  1. Daily override.
  2. Weekly schedule.
  3. `staff.shift_id` default.
- Manager closing and staff shift-closing consumers now follow that priority.
- Schedule remains planning metadata and does not block attendance by a
  replacement staff member.
- The roster UI uses English copy.
- The top standalone card above the roster was removed from the visible UI.
- `Use Current Location` now retries with a lower-accuracy geolocation request
  before showing a manual-entry error.
- Manager navigation label is now `Staff Manager`.
- Manager Staff Manager can edit staff records but cannot add or delete staff,
  and manager staff cards/tables no longer show generate-code actions.
- Owner staff delete is now a safe terminate/archive flow, because hard delete
  can be blocked by historical foreign keys such as `products.created_by`.

Database changes:

- None. Existing `shifts`, `staff_shift_weekly_assignments`,
  `staff_shift_daily_assignments`, and `staff.shift_id` are reused.

Files changed:

- `frontend/app/components/owner/staffmanager/WeeklyScheduleSection.tsx`
- `frontend/app/components/owner/staffmanager/EditStaffModal.tsx`
- `frontend/app/components/owner/staffmanager/AttendanceSection.tsx`
- `frontend/app/owner/staff-manager/page.tsx`
- `frontend/app/manager/staff-manager/page.tsx`
- `frontend/app/api/owner/staff-manager/positions/route.ts`
- `frontend/app/api/owner/staff-manager/weekly-shifts/route.ts`
- `frontend/app/api/staff/bookkeeping/shift-closing/route.ts`
- `frontend/app/manager/closing/page.tsx`
- `frontend/app/components/shared/i18n/translations/common.ts`
- `frontend/app/components/shared/i18n/translations/manager.ts`
- `frontend/app/components/ui/Navigation/Navbar/index.tsx`

Verification:

- Targeted ESLint: passed.
- `git diff --check`: passed.
- Full TypeScript still reports only the previously documented unrelated
  project errors; no Stage 5 file appears in the output.

Manual test before Stage 6:

1. Open Owner > Staff Manager > Attendance > Attendance Settings.
2. Assign different morning/night shifts across Monday-Sunday.
3. Save one staff row and refresh; selections must persist.
4. Open Edit Staff and verify the same seven-day pattern.
5. Create or retain a daily assignment for one date; updating the weekly
   pattern must not delete it.
6. Verify the daily assignment wins over the weekly pattern on Manager
   Closing.
7. Open Manager > Staff Manager; verify the label says Staff Manager, only
   Edit appears on staff cards/tables, and there is no add/delete/generate code
   action.
8. Delete a non-owner staff from Owner Staff Manager; the row should disappear
   from the active list without a foreign-key error.

Next stage:

- Stage 6 - Centralized currently-available staff source.

## 25. Stage 6 implementation record

Stage: 6 - Centralized currently-available staff source  
Status: Implemented; user acceptance testing required  
Date: 2026-06-24

Implemented:

- Added a reusable availability helper at
  `frontend/lib/staff/availability.ts`.
- Added `GET /api/staff/available`.
- Availability is derived from:
  1. active staff account,
  2. owned operational position,
  3. attendance record for the selected date,
  4. `clock_in_at` present,
  5. `clock_out_at` not present.
- Schedule is returned as context only:
  - daily assignment first,
  - weekly assignment second,
  - staff default shift third.
- Schedule does not block replacement staff from being considered available.
- The API supports position filters:
  - `?position=barista`
  - `?position=waiter`
  - `?positions=barista,waiter`
- By default the API returns currently available staff in `data`.
- `includeUnavailable=true` returns all staff rows with availability reasons.

Files changed:

- `frontend/lib/staff/availability.ts`
- `frontend/app/api/staff/available/route.ts`

Verification:

- Targeted ESLint for Stage 6 files: passed.
- `git diff --check` for Stage 6 files: passed.

Manual test before Stage 7:

1. Clock in a staff member with the `barista` position.
2. Call `/api/staff/available?position=barista`.
3. The clocked-in, not-clocked-out barista should appear in `available`.
4. Clock the staff member out.
5. Call the same endpoint again; the staff member should no longer appear in
   default `data`, but should appear with reason `clocked_out` when
   `includeUnavailable=true`.
6. Test a replacement staff member who is not scheduled but is clocked in; they
   should still be available.

Next stage:

- Stage 7 - Order station routing.

## 26. Stage 7 implementation record

Stage: 7 - Order station routing  
Status: Implemented; user acceptance testing required  
Date: 2026-06-24

Implemented:

- Added shared order station routing helper:
  `frontend/lib/orders/stationRouting.ts`.
- `categories.preparation_station` is now the shared source of truth for POS
  and QR checkout item routing.
- POS order creation uses the shared helper:
  - `kitchen` category items get `kitchen_status = pending`.
  - `bar`, `cashier`, and `none` category items get
    `kitchen_status = not_required`.
- QR checkout no longer guesses beverage/bar items from category or product
  names. It now reads `categories.preparation_station`.
- Kitchen Queue now fetches product category station data and filters visible
  items to `preparation_station = kitchen`, so stale or misrouted bar/cashier
  items do not appear in Kitchen Queue.
- Bar items remain offline bar workflow items. They are not created as
  kitchen-ready items and do not require barista button presses.

Files changed:

- `frontend/lib/orders/stationRouting.ts`
- `frontend/app/staff/pos/page.tsx`
- `frontend/app/customer/menu/checkout/page.tsx`
- `frontend/app/staff/kitchen/page.tsx`

Verification:

- Targeted ESLint for Stage 7 files: passed.
- `git diff --check` for Stage 7 files: passed.

Manual test before Stage 8:

1. Ensure one menu category has `preparation_station = kitchen`.
2. Ensure one drink/bar category has `preparation_station = bar`.
3. Create a POS order containing both items.
4. Kitchen Queue should show only the kitchen item.
5. Create a QR order containing both items.
6. Kitchen Queue should again show only the kitchen item.
7. Confirm the bar item does not require any barista app action.

Next stage:

- Stage 8 - Cashier Order coordination.

## 27. Stage 8 implementation record

Stage: 8 - Cashier Order coordination  
Status: Implemented; user acceptance testing required  
Date: 2026-06-24

Implemented:

- Staff Order access remains cashier-only through `canAccessStaffPath()` and
  `canUpdateStaffOrders()`.
- Added optional bar handler attribution for the cashier Process flow.
- Process remains non-blocking:
  - cashier can still process an order without choosing a barista,
  - no clocked-in barista does not block the order,
  - attribution is saved only for bar-routed, unserved items.
- Revised after manual review:
  - the main order card shows only the `Process` button,
  - clicking `Process` opens a small bar attribution dialog only when the order
    has bar-routed items,
  - a logged-in cashier who also has the `barista` position is included as the
    default bar handler option.
- Available barista options are loaded from
  `/api/staff/available?position=barista`, so the dropdown uses currently
  clocked-in staff.
- When exactly one barista is available, that barista is the default dropdown
  value, but cashier can still choose "No bar attribution".
- Order cards show `Bar: {name}` on attributed bar items.
- Kitchen remains unassigned.

Database change:

- Added migration:
  `frontend/supabase/migrations/202606240001_add_order_item_barista_attribution.sql`
- New `order_items` columns:
  - `assigned_barista_id`
  - `assigned_barista_by`
  - `assigned_barista_at`

Files changed:

- `frontend/supabase/migrations/202606240001_add_order_item_barista_attribution.sql`
- `frontend/app/staff/order/page.tsx`
- `frontend/app/components/shared/OrderCard.tsx`
- `frontend/lib/types/common.ts`

Verification:

- Targeted ESLint for Stage 8 files: passed with existing hook dependency
  warnings in `frontend/app/staff/order/page.tsx`.
- `git diff --check` for Stage 8 files: passed.

Manual test before Stage 9:

1. Run the Stage 8 SQL migration in Supabase.
2. Clock in one staff member with the `barista` position.
3. Create an order with one `preparation_station = bar` item.
4. Open cashier Order page.
5. Confirm New Order card shows `Bar handled by (optional)`.
6. Click Process without changing anything.
7. Order should move to On Process and the bar item should show
   `Bar: {barista name}`.
8. Create another bar order, choose `No bar attribution`, then Process.
9. Order should still move to On Process without error.
10. Create a kitchen-only order.
11. Process should not ask for bar attribution.

Next stage:

- Stage 9 - Handoff/fulfillment.

## 28. Stage 9 implementation record

Stage: 9 - Handoff/fulfillment  
Status: Implemented; user acceptance testing required  
Date: 2026-06-24

Implemented:

- Serve flow now supports optional waiter handoff for table service orders.
- Counter pickup orders never show a waiter/handoff selector.
- The handoff selector appears only inside the Serve panel, not on the main
  card surface.
- Waiter options are loaded from `/api/staff/available?position=waiter`, so
  only clocked-in waiter-position staff are suggested.
- If exactly one waiter is available, that waiter is the default handoff
  option, but cashier can still choose `No waiter handoff`.
- Marking items served remains item-aware; cashier can still select only the
  ready items in a mixed order.
- When a waiter is selected:
  - `order_items.served_by` stores the waiter/handoff staff.
  - `order_items.served_recorded_by` stores the cashier/staff account that
    recorded the handoff.
- When no waiter is selected:
  - `order_items.served_by` remains the recording cashier/staff account.
  - `order_items.served_recorded_by` also stores the recording account.

Database change:

- Added migration:
  `frontend/supabase/migrations/202606240002_add_order_item_served_recorded_by.sql`
- New `order_items` column:
  - `served_recorded_by`

Files changed:

- `frontend/supabase/migrations/202606240002_add_order_item_served_recorded_by.sql`
- `frontend/app/staff/order/page.tsx`
- `frontend/app/components/shared/OrderCard.tsx`
- `frontend/lib/types/common.ts`
- `frontend/docs/STAFF_OPERATIONS_REFACTOR_HANDOFF.md`

Verification:

- Targeted ESLint for Stage 9 files: passed.

Manual test before Stage 10:

1. Run the Stage 8 and Stage 9 SQL migrations in Supabase.
2. Clock in one staff member with the `waiter` position.
3. Create a `table_service` order with at least one ready-to-serve item.
4. Open cashier Order page and click `Serve Order`.
5. Confirm the Serve panel shows `Handoff to waiter`.
6. Select a waiter and mark one item served.
7. Confirm the order moves to `Partially Served` if some items remain.
8. Confirm `order_items.served_by` contains the waiter id and
   `served_recorded_by` contains the cashier id.
9. Create or open a `counter_pickup` order.
10. Click `Serve Order`.
11. Confirm no waiter selector appears.
12. Mark item served and confirm it still succeeds.

Next stage:

- Stage 10 - Reporting, notifications, cleanup.
