export function canOpenAttendanceKiosk(staff) {
  return (
    staff?.role === "staff" &&
    staff?.status === "active" &&
    Array.isArray(staff?.positions) &&
    staff.positions.includes("cashier")
  );
}
