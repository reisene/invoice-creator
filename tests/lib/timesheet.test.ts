import {
  fillWorkdays,
  generateTimesheetDays,
  isValidTimesheetDays,
  setDayType,
  sumTimesheetHours,
} from '@/lib/invoice/timesheet';
import { SAMPLE_INVOICE_PRESETS } from '@/lib/sampleInvoices';
import { describe, expect, it } from 'vitest';

describe('timesheet helpers', () => {
  it('generates days with weekends off', () => {
    const days = generateTimesheetDays('2026-03-01', '2026-03-31');
    expect(days).toHaveLength(31);
    expect(days[0]).toEqual({ date: '2026-03-01', type: 'off', hours: 0 });
    expect(days[1].type).toBe('work');
    expect(days.filter((d) => d.type === 'work')).toHaveLength(22);
  });

  it('returns empty for an invalid range', () => {
    expect(generateTimesheetDays('2026-03-10', '2026-03-01')).toEqual([]);
    expect(generateTimesheetDays('bad', '2026-03-01')).toEqual([]);
  });

  it('fills workdays and sums only work hours', () => {
    const days = fillWorkdays(
      generateTimesheetDays('2026-03-02', '2026-03-06'),
      8,
    );
    expect(sumTimesheetHours(days)).toBe(40);
    expect(sumTimesheetHours(setDayType(days, 0, 'sick'))).toBe(32);
  });

  it('zeroes hours for non-work days', () => {
    const days = fillWorkdays(
      generateTimesheetDays('2026-03-02', '2026-03-03'),
      8,
    );
    expect(setDayType(days, 0, 'leave')[0].hours).toBe(0);
  });

  it('validates days', () => {
    expect(
      isValidTimesheetDays([{ date: '2026-03-02', type: 'work', hours: 8 }]),
    ).toBe(true);
    expect(
      isValidTimesheetDays([{ date: '2026-03-02', type: 'work', hours: 25 }]),
    ).toBe(false);
    expect(isValidTimesheetDays([{ date: 'x', type: 'work', hours: 1 }])).toBe(
      false,
    );
  });

  it('hourly sample timesheet sums to hoursWorked', () => {
    const sample = SAMPLE_INVOICE_PRESETS.map((p) => p.formData).find(
      (s) => s.timesheet,
    );
    expect(sample).toBeDefined();
    expect(sumTimesheetHours(sample!.timesheet!)).toBe(
      Number(sample!.hoursWorked),
    );
  });
});
