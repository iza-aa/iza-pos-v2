export const STAFF_POSITIONS = [
  "cashier",
  "barista",
  "kitchen",
  "waiter",
] as const;

export type StaffPosition = (typeof STAFF_POSITIONS)[number];

export type StaffPositionAssignment = {
  id?: string;
  staff_id?: string;
  position: StaffPosition;
  is_primary: boolean;
  is_active: boolean;
};

export type StaffWithPositions = {
  staff_type?: string | null;
  staff_positions?: StaffPositionAssignment[] | null;
  positions?: StaffPositionAssignment[] | StaffPosition[] | null;
  primary_position?: StaffPosition | null;
};

const POSITION_ALIASES: Record<string, StaffPosition> = {
  cashier: "cashier",
  kasir: "cashier",
  bar: "barista",
  barista: "barista",
  bartender: "barista",
  kitchen: "kitchen",
  cook: "kitchen",
  chef: "kitchen",
  dapur: "kitchen",
  server: "waiter",
  waiter: "waiter",
  waitress: "waiter",
  pelayan: "waiter",
};

export const normalizeStaffPosition = (
  value: unknown,
): StaffPosition | null => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return POSITION_ALIASES[normalized] ?? null;
};

export const normalizeStaffPositions = (
  values: unknown,
): StaffPosition[] => {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .map((value) => {
          if (typeof value === "string") return normalizeStaffPosition(value);

          if (value && typeof value === "object" && "position" in value) {
            return normalizeStaffPosition(
              (value as { position?: unknown }).position,
            );
          }

          return null;
        })
        .filter((value): value is StaffPosition => Boolean(value)),
    ),
  );
};

export const getStaffPositions = (
  staff: StaffWithPositions,
): StaffPosition[] => {
  const explicitPositions = normalizeStaffPositions(
    staff.staff_positions ?? staff.positions,
  );

  if (explicitPositions.length > 0) return explicitPositions;

  const legacyPosition = normalizeStaffPosition(staff.staff_type);
  return legacyPosition ? [legacyPosition] : [];
};

export const getPrimaryStaffPosition = (
  staff: StaffWithPositions,
): StaffPosition | null => {
  const explicitPrimary = normalizeStaffPosition(staff.primary_position);
  if (explicitPrimary) return explicitPrimary;

  const positionRows = Array.isArray(staff.staff_positions)
    ? staff.staff_positions
    : [];
  const primaryRow = positionRows.find(
    (row) => row.is_active !== false && row.is_primary,
  );
  const rowPosition = normalizeStaffPosition(primaryRow?.position);

  if (rowPosition) return rowPosition;

  const positions = getStaffPositions(staff);
  const legacyPosition = normalizeStaffPosition(staff.staff_type);

  if (legacyPosition && positions.includes(legacyPosition)) {
    return legacyPosition;
  }

  return positions[0] ?? null;
};

export const getOrderedStaffPositions = (
  staff: StaffWithPositions,
): StaffPosition[] => {
  const positions = getStaffPositions(staff);
  const primaryPosition = getPrimaryStaffPosition(staff);

  if (!primaryPosition || !positions.includes(primaryPosition)) {
    return positions;
  }

  return [
    primaryPosition,
    ...positions.filter((position) => position !== primaryPosition),
  ];
};

export const getStaffPositionLabel = (position: StaffPosition) => {
  if (position === "cashier") return "Cashier";
  if (position === "barista") return "Barista";
  if (position === "kitchen") return "Kitchen";
  return "Waiter";
};

export const buildStaffPositionRows = ({
  staffId,
  positions,
  primaryPosition,
}: {
  staffId: string;
  positions: StaffPosition[];
  primaryPosition: StaffPosition;
}) =>
  positions.map((position) => ({
    staff_id: staffId,
    position,
    is_primary: position === primaryPosition,
    is_active: true,
    updated_at: new Date().toISOString(),
  }));
