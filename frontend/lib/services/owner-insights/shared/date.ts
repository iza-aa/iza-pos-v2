export const JAKARTA_TIME_ZONE = "Asia/Jakarta";

export function getJakartaLocalDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

export function addDaysToDateString(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00+07:00`);
  date.setDate(date.getDate() + days);
  return getJakartaLocalDate(date);
}

export function getJakartaEndOfDayIso(dateString = getJakartaLocalDate()) {
  return new Date(`${dateString}T23:59:59+07:00`).toISOString();
}
