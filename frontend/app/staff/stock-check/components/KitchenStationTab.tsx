import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import StandardTable, { type StandardTableColumn } from "@/app/components/shared/StandardTable";
import type { StationBatch, BulkOpenedMovement } from "../types";

export type KitchenStationTabProps = {
  openKitchenMoveModal: (type: "transfer" | "bulk") => void;
  setTestingModalOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  kitchenStationAvailable: boolean;
  loading: boolean;
  stationBatches: StationBatch[];
  filteredStationBatches: StationBatch[];
  filteredBulkOpenedMovements: BulkOpenedMovement[];
  stationBatchColumns: Array<StandardTableColumn<StationBatch>>;
  bulkOpenedColumns: Array<StandardTableColumn<BulkOpenedMovement>>;
};

export default function KitchenStationTab({
  openKitchenMoveModal,
  setTestingModalOpen,
  searchQuery,
  setSearchQuery,
  kitchenStationAvailable,
  loading,
  stationBatches,
  filteredStationBatches,
  filteredBulkOpenedMovements,
  stationBatchColumns,
  bulkOpenedColumns,
}: KitchenStationTabProps) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="shrink-0">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-950">Kitchen Station Table</h2>
            <p className="mt-1 text-sm text-gray-500">
              Move master stock into kitchen, then track station stock or opened ingredients.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
            <button
              type="button"
              onClick={() => openKitchenMoveModal("transfer")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white"
            >
              <PlusIcon className="h-4 w-4" />
              Move to Kitchen
            </button>
            <button
              type="button"
              onClick={() => setTestingModalOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900"
            >
              <PlusIcon className="h-4 w-4" />
              Test Menu
            </button>
            <div className="relative w-full lg:w-72">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search station batches..."
                className="h-11 w-full rounded-xl border border-gray-200 pl-10 pr-3 text-sm outline-none transition focus:border-gray-900"
              />
            </div>
          </div>
        </div>
        {!kitchenStationAvailable ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-700">
            Kitchen station tables are not ready yet. Run the kitchen station SQL before using this workflow.
          </div>
        ) : null}
        {kitchenStationAvailable && !loading && stationBatches.length === 0 ? (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <p className="font-semibold">No kitchen stock has been moved yet.</p>
            <p className="mt-1">
              Use Move to Kitchen to pull stock from Inventory Master. Choose Station Stock for POS-deduct items,
              or Opened Ingredient for kitchen-use ingredients.
            </p>
          </div>
        ) : null}
        {kitchenStationAvailable && !loading && stationBatches.length > 0 ? (
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
            Station stock and opened ingredients carry over between shifts until POS usage, waste, or a kitchen action closes them.
          </div>
        ) : null}
      </div>
      <div className="h-fit max-h-[calc(100vh-184px)] space-y-6 overflow-y-auto">
        <div>
          <StandardTable
            columns={stationBatchColumns}
            data={filteredStationBatches}
            getRowKey={(batch) => batch.id}
            emptyLabel={
              loading
                ? "Loading kitchen station..."
                : "No kitchen stock has been moved yet. Use Move to Kitchen first."
            }
            loading={loading}
            minWidthClassName="min-w-[980px]"
          />
        </div>

        <div className="border-t border-gray-200 pt-4">
          <div className="mb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-950">Opened Ingredients</h3>
              <p className="mt-1 text-sm text-gray-500">
                Ingredients opened for kitchen use and still active. The Shift column shows when each item was opened.
              </p>
            </div>
          </div>
          <StandardTable
            columns={bulkOpenedColumns}
            data={filteredBulkOpenedMovements}
            getRowKey={(movement) => movement.id}
            emptyLabel={
              loading
                ? "Loading opened ingredients..."
                : "No opened ingredient is active. Use Move to Kitchen when kitchen opens an ingredient."
            }
            loading={loading}
            minWidthClassName="min-w-[980px]"
          />
        </div>
      </div>
    </div>
  );
}
