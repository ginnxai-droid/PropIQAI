import type { LeadPriority } from "./scoring";

export interface SlaDeadlineInput {
  priority: LeadPriority;
  urgentHandoff?: boolean;
  now?: Date;
}

const IST_OFFSET_MINUTES = 330;

function istParts(date: Date) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MINUTES * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    hour: shifted.getUTCHours(),
  };
}

function fromIstParts(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
): Date {
  return new Date(
    Date.UTC(year, month, day, hour, minute) -
      IST_OFFSET_MINUTES * 60_000,
  );
}

function nextBusinessDayEnd(now: Date): Date {
  const parts = istParts(now);
  let day = parts.day + (parts.hour < 17 ? 0 : 1);
  let candidate = fromIstParts(parts.year, parts.month, day, 17);
  while ([0, 6].includes(istParts(candidate).weekday)) {
    day += 1;
    candidate = fromIstParts(parts.year, parts.month, day, 17);
  }
  return candidate;
}

export function calculateSlaDeadline({
  priority,
  urgentHandoff = false,
  now = new Date(),
}: SlaDeadlineInput): Date | null {
  if (priority === "HOT") {
    return new Date(now.getTime() + (urgentHandoff ? 5 : 10) * 60_000);
  }
  if (priority === "WARM") {
    return nextBusinessDayEnd(now);
  }
  if (priority === "NURTURE") {
    return new Date(now.getTime() + 48 * 60 * 60_000);
  }
  return null;
}

export function escalationLevel(
  dueAt: Date,
  now = new Date(),
  completedAt?: Date | null,
): number {
  if (completedAt || dueAt.getTime() >= now.getTime()) return 0;
  const overdueMinutes = Math.floor(
    (now.getTime() - dueAt.getTime()) / 60_000,
  );
  if (overdueMinutes < 15) return 1;
  if (overdueMinutes < 30) return 2;
  if (overdueMinutes < 60) return 3;
  return 4;
}
