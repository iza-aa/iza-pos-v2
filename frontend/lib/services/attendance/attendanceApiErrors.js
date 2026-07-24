const attendanceErrorKeys = {
  AUTH_REQUIRED: "staffAttendance.sessionExpired",
  CASHIER_ACCESS: "staffAttendance.cashierAccessRequired",
  QR_UNAVAILABLE: "staffAttendance.qrUnavailable",
  INVALID_LOCATION: "staffAttendance.invalidLocation",
  SUBMIT_REJECTED: "staffAttendance.qrExpired",
  SUBMIT_FAILED: "staffAttendance.submitFailed",
};

export const getAttendanceErrorTranslationKey = (errorCode) =>
  attendanceErrorKeys[errorCode] ?? "staffAttendance.submitFailed";
