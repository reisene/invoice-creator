const RETENTION_MONTHS = 12;

export function getContactMessageRetentionCutoff(now = new Date()): Date {
  const totalMonths =
    now.getUTCFullYear() * 12 + now.getUTCMonth() - RETENTION_MONTHS;
  const year = Math.floor(totalMonths / 12);
  const month = ((totalMonths % 12) + 12) % 12;
  const day = Math.min(
    now.getUTCDate(),
    new Date(Date.UTC(year, month + 1, 0)).getUTCDate(),
  );

  return new Date(
    Date.UTC(
      year,
      month,
      day,
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
      now.getUTCMilliseconds(),
    ),
  );
}
