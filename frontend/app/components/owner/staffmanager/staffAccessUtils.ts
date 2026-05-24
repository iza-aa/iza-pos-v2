import { isLoginCodeValid } from "@/lib/constants";

export type StaffAccessRecord = {
  role?: string | null;
  login_code?: string | null;
  login_code_expires_at?: string | null;
  pin_hash?: string | null;
  password_hash?: string | null;
  must_change_pin?: boolean | null;
};

export type StaffAccessState = {
  label: string;
  description: string;
  badgeClass: string;
  actionLabel: string;
  hasValidLoginCode: boolean;
  canCopyCode: boolean;
  shouldShowAccess: boolean;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const getStaffAccessState = (
  staff: StaffAccessRecord,
): StaffAccessState => {
  const role = String(staff.role ?? "").toLowerCase();
  const hasPin = Boolean(staff.pin_hash || staff.password_hash);
  const hasValidLoginCode = isLoginCodeValid(
    staff.login_code ?? undefined,
    staff.login_code_expires_at ?? undefined,
  );
  const hasAnyLoginCode = Boolean(staff.login_code);
  const shouldShowAccess = role === "staff";

  if (hasValidLoginCode && staff.must_change_pin) {
    return {
      label: "Waiting for New PIN",
      description: `Code is active until ${formatDateTime(staff.login_code_expires_at)}.`,
      badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
      actionLabel: "Regenerate Code",
      hasValidLoginCode,
      canCopyCode: Boolean(staff.login_code),
      shouldShowAccess,
    };
  }

  if (hasValidLoginCode) {
    return {
      label: "Active Activation Code",
      description: `Valid until ${formatDateTime(staff.login_code_expires_at)}.`,
      badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
      actionLabel: "Regenerate Code",
      hasValidLoginCode,
      canCopyCode: Boolean(staff.login_code),
      shouldShowAccess,
    };
  }

  if (!hasPin && hasAnyLoginCode) {
    return {
      label: "Expired Code",
      description: "Regenerate the code so staff can activate the account.",
      badgeClass: "border-red-200 bg-red-50 text-red-700",
      actionLabel: "Regenerate Code",
      hasValidLoginCode,
      canCopyCode: false,
      shouldShowAccess,
    };
  }

  if (!hasPin) {
    return {
      label: "Not Activated",
      description: "This staff member does not have a login PIN yet.",
      badgeClass: "border-gray-200 bg-gray-50 text-gray-700",
      actionLabel: "Create Login Code",
      hasValidLoginCode,
      canCopyCode: false,
      shouldShowAccess,
    };
  }

  if (staff.must_change_pin) {
    return {
      label: "PIN Reset Required",
      description: "This staff member needs to log in with a temporary code.",
      badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
      actionLabel: "Create Reset Code",
      hasValidLoginCode,
      canCopyCode: false,
      shouldShowAccess,
    };
  }

  return {
    label: "Active",
    description: "This staff member can log in with a PIN.",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    actionLabel: "Reset PIN",
    hasValidLoginCode,
    canCopyCode: false,
    shouldShowAccess,
  };
};
