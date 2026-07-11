import { ClockIcon, BanknotesIcon } from "@heroicons/react/24/outline";
import type { StaffAttendanceTab } from "./types";

export const QR_READER_ELEMENT_ID = "staff-attendance-qr-reader";
export const MAX_LOCATION_ACCURACY_METERS = 100;

export const staffAttendanceTabs = [
  {
    id: "absence",
    label: "Absence",
    description: "Clock in and out",
    icon: ClockIcon,
  },
  {
    id: "end-shift",
    label: "Cashier Shift",
    description: "Open & close shift",
    icon: BanknotesIcon,
  },
] satisfies Array<{
  id: StaffAttendanceTab;
  label: string;
  description: string;
  icon: typeof ClockIcon;
}>;
