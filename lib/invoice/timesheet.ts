import type { DayType, TimesheetDay } from '@/types/invoiceForm';

export const DAY_TYPES: readonly DayType[] = ['work', 'sick', 'leave', 'off'];

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  work: 'Praca',
  sick: 'L4',
  leave: 'Urlop',
  off: 'Wolne',
};

const DAY_MS = 86_400_000;
const MAX_DAYS = 366;

function parseIso(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(ms) ? null : ms;
}

/** One entry per calendar day of the period; weekends default to "off". */
export function generateTimesheetDays(
  periodStart: string,
  periodEnd: string,
): TimesheetDay[] {
  const start = parseIso(periodStart);
  const end = parseIso(periodEnd);
  if (start === null || end === null || end < start) return [];

  const days: TimesheetDay[] = [];
  for (let ms = start; ms <= end && days.length < MAX_DAYS; ms += DAY_MS) {
    const date = new Date(ms);
    const weekday = date.getUTCDay();
    days.push({
      date: date.toISOString().slice(0, 10),
      type: weekday === 0 || weekday === 6 ? 'off' : 'work',
      hours: 0,
    });
  }
  return days;
}

/** Sum of hours on "work" days, rounded to 2 decimals. */
export function sumTimesheetHours(days: readonly TimesheetDay[]): number {
  const total = days.reduce(
    (sum, day) => (day.type === 'work' ? sum + day.hours : sum),
    0,
  );
  return Math.round(total * 100) / 100;
}

/** Fills "work" days with the given hours, other days get 0. */
export function fillWorkdays(
  days: readonly TimesheetDay[],
  hours: number,
): TimesheetDay[] {
  return days.map((day) => ({
    ...day,
    hours: day.type === 'work' ? hours : 0,
  }));
}

/** Changes the day type; non-work days always have 0 hours. */
export function setDayType(
  days: readonly TimesheetDay[],
  index: number,
  type: DayType,
): TimesheetDay[] {
  return days.map((day, i) =>
    i === index
      ? { ...day, type, hours: type === 'work' ? day.hours : 0 }
      : day,
  );
}

export function isValidTimesheetDays(days: readonly TimesheetDay[]): boolean {
  return days.every(
    (day) =>
      parseIso(day.date) !== null &&
      DAY_TYPES.includes(day.type) &&
      Number.isFinite(day.hours) &&
      day.hours >= 0 &&
      day.hours <= 24,
  );
}
