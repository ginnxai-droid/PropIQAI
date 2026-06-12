export const BUSINESS_HOURS_VERSION = "india-mon-sat-10-19-v1";
export const BUSINESS_TIME_ZONE = "Asia/Kolkata";

interface LocalBusinessTime {
  weekday: string;
  hour: number;
  minute: number;
}

function localBusinessTime(date: Date): LocalBusinessTime {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    weekday: value("weekday"),
    hour: Number(value("hour")),
    minute: Number(value("minute")),
  };
}

export function isAfterBusinessHours(date: Date): boolean {
  const local = localBusinessTime(date);
  if (local.weekday === "Sun") {
    return true;
  }
  const minutes = local.hour * 60 + local.minute;
  return minutes < 10 * 60 || minutes >= 19 * 60;
}
