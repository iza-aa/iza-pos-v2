const TABLE_QR_TOKEN_PATTERN = /^qr_[a-f0-9]{32}$/;

export function createTableQrToken() {
  return `qr_${crypto.randomUUID().replaceAll("-", "")}`;
}

export function isTableQrToken(value) {
  return typeof value === "string" && TABLE_QR_TOKEN_PATTERN.test(value);
}
