import { XMarkIcon } from "@heroicons/react/24/outline";
import { ActivityLog } from "@/lib/types";
import { formatJakartaDateTimeParts } from "@/lib/constants/time";

interface ActivityLogDetailProps {
  log: ActivityLog | null;
  onClose: () => void;
}

const getSeverityClass = (severity: string) => {
  const normalized = severity.toLowerCase();

  if (normalized === "critical" || normalized === "error" || normalized === "warning") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  return "bg-gray-100 text-gray-700 border-gray-200";
};

const formatLabel = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const DetailSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-lg border border-gray-200 bg-white p-4">
    <h3 className="text-sm font-bold text-gray-950">{title}</h3>
    <div className="mt-3">{children}</div>
  </section>
);

const Field = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="rounded-lg bg-gray-50 px-3 py-2">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="mt-1 break-words text-sm font-semibold text-gray-900">{value || "-"}</p>
  </div>
);

export default function ActivityLogDetail({ log, onClose }: ActivityLogDetailProps) {
  if (!log) return null;

  const changesSummary = log.changesSummary ?? [];
  const dateTime = formatJakartaDateTimeParts(log.timestamp);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Activity Detail</p>
            <h2 className="mt-1 text-lg font-bold text-gray-950">{log.actionDescription}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {dateTime.date} / {dateTime.time} / {log.userName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close activity details"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="space-y-4">
            <DetailSection title="Event">
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${getSeverityClass(log.severity)}`}>
                  {formatLabel(log.severity)}
                </span>
                <span className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600">
                  {formatLabel(log.actionCategory)}
                </span>
                <span className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600">
                  {formatLabel(log.action)}
                </span>
              </div>
            </DetailSection>

            <DetailSection title="User">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name" value={log.userName} />
                <Field label="Role" value={formatLabel(log.userRole)} />
              </div>
            </DetailSection>

            <DetailSection title="Resource">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Type" value={formatLabel(log.resourceType)} />
                <Field label="Name" value={log.resourceName} />
              </div>
            </DetailSection>

            {changesSummary.length > 0 ? (
              <DetailSection title="Changes Made">
                <div className="space-y-2">
                  {changesSummary.map((change, index) => (
                    <div key={`${log.id}-detail-change-${index}`} className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                      {change}
                    </div>
                  ))}
                </div>
              </DetailSection>
            ) : null}

            {log.notes ? (
              <DetailSection title="Notes">
                <p className="text-sm text-gray-700">{log.notes}</p>
              </DetailSection>
            ) : null}

            <DetailSection title="Audit Metadata">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="IP Address" value={log.ipAddress} />
              </div>
            </DetailSection>
          </div>
        </div>
      </div>
    </div>
  );
}
