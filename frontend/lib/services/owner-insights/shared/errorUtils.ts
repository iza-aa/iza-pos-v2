export function describeUnknownError(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = typeof record.message === "string" ? record.message : "";
    const details = typeof record.details === "string" ? record.details : "";
    const hint = typeof record.hint === "string" ? record.hint : "";
    const code = typeof record.code === "string" ? record.code : "";

    return [message, details, hint, code ? `Code: ${code}` : ""]
      .filter(Boolean)
      .join(" ");
  }

  if (typeof error === "string") return error;

  return fallback;
}
