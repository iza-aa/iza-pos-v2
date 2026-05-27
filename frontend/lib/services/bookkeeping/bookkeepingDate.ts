const JAKARTA_TIME_ZONE = "Asia/Jakarta";
const JAKARTA_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

export const parseDatabaseTimestamp = (timestamp: string) => {
  const hasTimeZone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(timestamp);
  return new Date(hasTimeZone ? timestamp : `${timestamp}Z`);
};

export const formatJakartaBusinessDate = (timestamp?: string | null) => {
  if (!timestamp) return "";

  const date = parseDatabaseTimestamp(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp.slice(0, 10);

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const valueByType = new Map(parts.map((part) => [part.type, part.value]));

  return `${valueByType.get("year")}-${valueByType.get("month")}-${valueByType.get("day")}`;
};

export const formatJakartaBusinessTime = (timestamp?: string | null) => {
  if (!timestamp) return "";

  const date = parseDatabaseTimestamp(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp.slice(11, 19);

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: JAKARTA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
};

export const formatJakartaDisplayDateTime = (timestamp?: string | null) => {
  if (!timestamp) return "-";

  const date = parseDatabaseTimestamp(timestamp);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: JAKARTA_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const getJakartaTodayDate = () => formatJakartaBusinessDate(new Date().toISOString());

export const toJakartaDateTime = (date: string, time: string) => {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second] = time.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - JAKARTA_UTC_OFFSET_MS).toISOString();
};

export const toJakartaDateTimeStart = (date: string) => toJakartaDateTime(date, "00:00:00");
export const toJakartaDateTimeEnd = (date: string) => toJakartaDateTime(date, "23:59:59");

export const toUtcDateOnly = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};
