import { DateRangeFilter, type DateRangeValue } from "@/app/components/shared";
import StandardTable, { type StandardTableColumn } from "@/app/components/shared/StandardTable";
import type { StockReport } from "../types";

export type MyReportsTabProps = {
  dateRange: DateRangeValue;
  setDateRange: (range: DateRangeValue) => void;
  stockReportsAvailable: boolean;
  loading: boolean;
  reports: StockReport[];
  reportColumns: Array<StandardTableColumn<StockReport>>;
};

export default function MyReportsTab({
  dateRange,
  setDateRange,
  stockReportsAvailable,
  loading,
  reports,
  reportColumns,
}: MyReportsTabProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="shrink-0">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {!stockReportsAvailable ? (
          <div className="mb-4 shrink-0 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-700">
            Stock reports table is not ready yet. Run the stock reports SQL before submitting or viewing reports.
          </div>
        ) : null}
        <div className="h-fit max-h-[calc(100vh-292px)] overflow-y-auto">
          <StandardTable
            columns={reportColumns}
            data={reports}
            getRowKey={(report) => report.id}
            emptyLabel={loading ? "Loading reports..." : "No reports in this period."}
            loading={loading}
            minWidthClassName="min-w-[920px]"
          />
        </div>
      </div>
    </div>
  );
}
