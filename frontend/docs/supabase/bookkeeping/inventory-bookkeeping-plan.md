# Inventory Foundation For Automatic Bookkeeping

Dokumen ini menjelaskan perubahan yang dibutuhkan pada `Manager Inventory` agar inventory tidak hanya menjadi alat operasional stok, tetapi juga menjadi sumber data yang aman untuk automatic bookkeeping, COGS, waste tracking, restock cost, dan retail food readiness.

## Product Goal

Inventory harus bisa menjawab pertanyaan pembukuan berikut:

- barang apa yang berubah
- kapan berubah
- kenapa berubah
- siapa yang melakukan
- berasal dari transaksi apa
- nilainya berapa rupiah
- dampaknya masuk ke COGS, stock purchase, waste, shrinkage, atau correction

Target akhirnya:

- restock otomatis menjadi stock purchase record
- recipe usage otomatis menjadi COGS estimate
- expired/damaged/lost otomatis menjadi waste or shrinkage signal
- inventory movement bisa diaudit owner
- owner tidak perlu menghitung bahan baku manual untuk membaca margin

## Current Inventory Readiness

Inventory manager saat ini sudah punya fondasi yang bagus:

- `Raw Materials`
- `Variants`
- `Recipes`
  - `Dishes (Base Recipes)`
  - `Product Variant Recipes`
- `Usage History`
- restock flow
- stock adjustment flow
- recipe-based stock deduction from orders

Namun untuk automatic bookkeeping, beberapa data masih belum cukup structured.

## Current Gaps

### 1. Restock Cost Masih Lemah

`RestockModal` sudah punya `Cost Per Unit`, tetapi nilai cost masih diperlakukan sebagai catatan operasional dan ditulis ke notes.

Masalah:

- bookkeeping tidak boleh bergantung pada parsing text
- total restock cost tidak bisa diaudit dengan aman
- supplier invoice tidak bisa dilacak
- paid/unpaid purchase tidak bisa dibedakan

Yang dibutuhkan:

- `unit_cost`
- `total_cost`
- `supplier_name`
- `invoice_number`
- `purchase_date`
- `payment_method`
- `payment_status`
- `source_type = restock`

### 2. COGS Belum Punya Cost Snapshot

Recipe menyimpan bahan dan quantity. Itu cukup untuk menghitung penggunaan stok, tetapi belum cukup untuk laporan margin yang stabil.

Masalah:

- harga bahan bisa berubah setelah order terjadi
- profit order lama bisa berubah jika COGS dihitung ulang dari harga terbaru
- owner bisa melihat margin yang tidak konsisten

Yang dibutuhkan saat order menghasilkan usage:

- `unit_cost_at_time`
- `total_cost_at_time`
- `cost_method`
- `recipe_id`
- `order_id`
- `order_item_id`
- `product_id`

Rule:

```text
COGS must be snapshotted at transaction time.
Never recompute old COGS only from the latest inventory item cost.
```

### 3. Adjustment Reason Perlu Accounting Category

Adjustment saat ini sudah punya reason seperti:

- damaged/spoiled
- expired
- lost/stolen
- stock count correction
- quality issue

Untuk pembukuan, reason perlu dipetakan ke kategori dampak:

| Adjustment Reason | Bookkeeping Category | Direction |
| --- | --- | --- |
| Damaged / Spoiled | waste | out |
| Expired | waste | out |
| Lost / Stolen | shrinkage | out |
| Stock Count Correction | correction | neutral/out/in |
| Quality Issue | waste | out |
| Other | manual_review | neutral |

Rule:

- Waste dan shrinkage boleh masuk Cost & Margin / Exceptions.
- Correction tidak boleh langsung dianggap expense tanpa review.
- Adjustment besar harus muncul di Exceptions.

### 4. Delete Item Harus Menjadi Archive

Inventory item sebaiknya tidak dihapus permanen jika pernah dipakai transaksi, recipe, restock, atau usage history.

Masalah jika hard delete:

- laporan lama kehilangan referensi barang
- recipe lama sulit diaudit
- COGS history tidak lengkap

Yang dibutuhkan:

- `is_active`
- `archived_at`
- `archived_by`
- `archive_reason`

Rule:

```text
Inventory item with transaction history should be archived, not deleted.
```

### 5. Batch / Expiry Belum Ada

Untuk coffee shop MVP, sistem masih bisa berjalan tanpa batch. Tetapi untuk retail food, bakery, dairy, frozen food, dan bahan cepat basi, batch/expiry menjadi penting.

Yang dibutuhkan untuk retail readiness:

- batch number
- expiry date
- received quantity
- remaining quantity
- unit cost per batch
- supplier
- receipt/invoice reference
- FEFO stock usage readiness

Rule:

```text
Batch is optional for coffee shop MVP, but should be designed as an extension path.
```

## Recommended Inventory Navigation

Current inventory sidebar can stay conceptually similar, but later should be standardized with shared sidebar tabset.

Recommended final manager inventory tabs:

1. `Stock Items`
2. `Recipes`
   - `Base Recipes`
   - `Variant Recipes`
3. `Stock Movements`
4. `Cost Setup`
5. `Exceptions`

Why:

- `Stock Items` handles raw materials and supplies.
- `Recipes` handles product-to-ingredient mapping.
- `Stock Movements` is the audit trail.
- `Cost Setup` makes COGS readiness explicit.
- `Exceptions` keeps manager focused on missing cost, negative stock, and broken recipes.

## Tab Details

### Stock Items

Purpose: Manage inventory master data.

Fields:

- Item Name
- Category
- Unit
- Current Stock
- Reorder Level
- Default Unit Cost
- Supplier
- Active Status
- Last Restocked
- Cost Completeness Status

Actions:

- Add Item
- Edit Item
- Restock
- Adjust Stock
- Archive Item

Business rules:

- Stock should not be manually changed inside edit modal.
- Stock changes must use restock or adjustment.
- Item with usage history should not be hard deleted.

### Recipes > Base Recipes

Purpose: Define default ingredient usage for one product.

Fields:

- Product
- Inventory Item
- Quantity Needed
- Unit
- Cost Readiness

Rules:

- Product sold without recipe creates bookkeeping exception.
- Recipe ingredient without cost creates cost exception.
- Recipe update should not mutate historical COGS snapshots.

### Recipes > Variant Recipes

Purpose: Add or subtract inventory usage based on product variant.

Examples:

- Large coffee adds more milk
- Extra cheese adds cheese cost
- No sugar subtracts sugar usage

Rules:

- Variant adjustment must always be linked to product, variant option, and inventory item.
- Adjustment can be positive or negative.
- Historical sales must use snapshot at order time.

### Stock Movements

Purpose: Audit every inventory movement.

Movement types:

- `sale_usage`
- `restock`
- `adjustment`
- `archive`
- `manual_correction`
- `batch_expiry`

Columns:

- Date/Time
- Item
- Type
- Quantity
- Unit
- Previous Stock
- New Stock
- Unit Cost
- Total Value
- Source
- Performed By
- Notes

Rules:

- Every stock movement should have source metadata.
- Financial movement must have value if cost data is available.
- Missing cost should be visible as `Cost Data Needed`.

### Cost Setup

Purpose: Let manager complete missing inventory cost data before owner reads margin.

Content:

- items missing unit cost
- products missing recipe
- recipes using ingredients with missing cost
- recent restocks without cost
- top items by usage value

Actions:

- Update Default Cost
- Open Item
- Open Recipe
- Mark Reviewed

Rules:

- Manager can complete cost data if permission allows.
- Owner dashboard must not claim accurate margin while cost is incomplete.

### Exceptions

Purpose: Show inventory issues that can damage bookkeeping accuracy.

Exception types:

- negative stock
- item below reorder level
- item missing unit cost
- sold product missing recipe
- recipe item missing inventory reference
- restock without cost
- stock movement without source
- large adjustment
- expired batch
- item archived but still used in active recipe

Actions:

- View Source
- Fix Item
- Fix Recipe
- Mark Reviewed
- Add Note

## Suggested Database Changes

### Add Columns To `inventory_items`

```sql
alter table public.inventory_items
add column if not exists default_unit_cost numeric,
add column if not exists cost_source text default 'manual',
add column if not exists is_active boolean not null default true,
add column if not exists archived_at timestamptz,
add column if not exists archived_by text,
add column if not exists archive_reason text;
```

### Strengthen `usage_transactions`

```sql
alter table public.usage_transactions
add column if not exists business_date date,
add column if not exists source_table text,
add column if not exists source_id text,
add column if not exists source_label text,
add column if not exists payment_method text,
add column if not exists total_value numeric,
add column if not exists bookkeeping_category text,
add column if not exists bookkeeping_status text not null default 'pending';
```

### Strengthen `usage_transaction_details`

```sql
alter table public.usage_transaction_details
add column if not exists unit_cost_at_time numeric,
add column if not exists total_cost_at_time numeric,
add column if not exists cost_method text,
add column if not exists order_item_id text,
add column if not exists product_id text,
add column if not exists recipe_id text,
add column if not exists batch_id text;
```

### Optional Future Table: `inventory_batches`

```sql
create table if not exists public.inventory_batches (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null,
  batch_number text,
  supplier_name text,
  received_at timestamptz not null default now(),
  expiry_date date,
  received_quantity numeric not null default 0,
  remaining_quantity numeric not null default 0,
  unit text not null,
  unit_cost numeric,
  total_cost numeric,
  invoice_number text,
  status text not null default 'active',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Optional Future Table: `inventory_suppliers`

```sql
create table if not exists public.inventory_suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## Automatic Bookkeeping Mapping

### Restock To Stock Purchase

Trigger:

- inventory restock saved
- quantity > 0
- unit cost exists

Bookkeeping entry:

```text
type: stock_purchase
direction: out
amount: quantity * unit_cost
source_table: usage_transactions
source_id: restock transaction id
```

If cost missing:

- create inventory exception
- do not create fake purchase value

### Sale Usage To COGS

Trigger:

- order is paid
- recipe exists
- inventory item cost exists

Bookkeeping entry:

```text
type: cogs_estimate
direction: out
amount: sum(recipe usage * unit_cost_at_time)
source_table: orders
source_id: order id
```

If recipe or cost missing:

- create exception
- show `Cost Data Needed`

### Adjustment To Waste / Shrinkage / Correction

Trigger:

- stock adjustment saved
- stock decreases or increases

Bookkeeping behavior:

- damaged/expired = waste
- lost/stolen = shrinkage
- stock count correction = correction
- other = manual review

If value cannot be computed:

- create exception

## Coffee Shop MVP

For coffee shop, minimum required changes:

1. Add structured `default_unit_cost`.
2. Store `unit_cost_at_time` and `total_cost_at_time` on usage details.
3. Save restock `unit_cost` and `total_cost` as columns, not notes only.
4. Archive inventory items instead of hard delete.
5. Show Cost Setup tab for missing recipe and missing item cost.

This is enough for:

- estimated COGS
- menu profitability
- inventory purchase tracking
- margin warning
- cost completeness status

## Retail Food Readiness

For retail food, add after coffee shop MVP:

1. `inventory_batches`
2. expiry date tracking
3. FEFO usage recommendation
4. batch-level cost
5. damaged/expired batch exception
6. supplier purchase history
7. item barcode/SKU if needed

This makes the system safer for:

- packaged food
- bakery
- frozen food
- dairy
- ready-to-eat retail
- multi-branch stock later

## UI Standardization Requirements

Follow `frontend/standarisasiUIUX.md`.

Rules:

- Use shared `SidebarTabset`.
- Use `DateRangeFilter` for stock movement and exception history.
- Use `StandardTable` for all inventory tables.
- Use `OWNER_SEMANTIC_TONES` from `theme.ts`.
- Do not use decorative icons in infobox/cards.
- Tables must have title and description.
- Table action buttons should use icon-only buttons with `title` and `aria-label`.
- Keep card spacing aligned with Owner Dashboard.
- Do not nest cards inside cards.

## Recommended Frontend Structure

```text
frontend/
  app/
    components/
      manager/
        inventory/
          ManagerInventory.tsx
          InventorySidebar.tsx
          tabs/
            StockItemsTab.tsx
            RecipesTab.tsx
            StockMovementsTab.tsx
            CostSetupTab.tsx
            InventoryExceptionsTab.tsx
          stock-items/
            InventoryItemModal.tsx
            RestockModal.tsx
            AdjustmentModal.tsx
            ArchiveInventoryItemModal.tsx
          recipes/
            BaseRecipePanel.tsx
            VariantRecipePanel.tsx
            RecipeCostStatusBadge.tsx
          movements/
            StockMovementTable.tsx
            StockMovementDetailModal.tsx
          cost-setup/
            MissingCostTable.tsx
            MissingRecipeTable.tsx
          exceptions/
            InventoryExceptionTable.tsx
            InventoryExceptionDetailModal.tsx
  lib/
    services/
      inventory/
        inventoryTypes.ts
        inventoryCostService.ts
        inventoryMovementService.ts
        inventoryRecipeService.ts
        inventoryExceptionService.ts
        inventoryBatchService.ts
      bookkeeping/
        cogsEntryBuilder.ts
        stockPurchaseEntryBuilder.ts
```

## Implementation Phases

### Phase 1: Inventory Cost Foundation

- Add structured item cost fields.
- Store restock cost as structured values.
- Add cost completeness status.
- Keep existing UI behavior stable.

Definition of Done:

- restock cost no longer depends on notes parsing
- inventory items can show missing cost clearly
- owner dashboard can read inventory cost safely

### Phase 2: Movement Source And COGS Snapshot

- Add unit cost snapshot to usage details.
- Link usage to order item/product/recipe.
- Ensure sale usage can generate COGS estimate.

Definition of Done:

- old order margin remains stable after item cost changes
- missing recipe/cost creates exception
- no fake COGS is shown

### Phase 3: Inventory UI Standardization

- Refactor inventory sidebar to shared tabset.
- Refactor inventory tables to `StandardTable`.
- Apply shared tone system.
- Add DateRangeFilter to stock movement and exceptions.

Definition of Done:

- inventory UI matches dashboard/staff manager standard
- tables are visually consistent
- mobile layout remains usable

### Phase 4: Cost Setup And Exceptions

- Add Cost Setup tab.
- Add Inventory Exceptions tab.
- Connect exceptions to bookkeeping readiness.

Definition of Done:

- manager can see what blocks accurate COGS
- owner can trust margin status
- unresolved inventory issues are visible

### Phase 5: Retail Food Batch Readiness

- Add optional batch/expiry table.
- Add expiry alerts.
- Add batch cost support.
- Add FEFO readiness.

Definition of Done:

- retail food can track expiry and batch cost
- expired/damaged batch can generate exception
- coffee shop workflow remains simple

## Final Recommendation

Do not rebuild inventory from scratch.

Use the existing inventory manager as the operational base, then strengthen it with:

- structured cost data
- movement source metadata
- COGS snapshots
- archive instead of delete
- cost setup and exceptions
- optional batch/expiry extension

This keeps the coffee shop app simple today while making the system ready for automatic bookkeeping and future retail food use cases.
