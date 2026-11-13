import { TimesheetEditor } from '@/components/generator/TimesheetEditor';
import type { InvoiceFormData, TimesheetDay } from '@/types/invoiceForm';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(cleanup);

function makeData(overrides: Partial<InvoiceFormData> = {}): InvoiceFormData {
  return {
    periodStart: '2025-03-03',
    periodEnd: '2025-03-09',
    hoursWorked: 0,
    ...overrides,
  } as InvoiceFormData;
}

function Wrapper({
  initial,
  spy,
}: {
  initial: InvoiceFormData;
  spy?: (d: InvoiceFormData) => void;
}) {
  const [data, setData] = useState(initial);
  return (
    <TimesheetEditor
      data={data}
      onChange={(next) => {
        spy?.(next);
        setData(next);
      }}
    />
  );
}

const toggleSwitch = () =>
  screen.getByLabelText('Wykaz godzin (dzień po dniu)');

describe('TimesheetEditor', () => {
  it('enables and disables the timesheet', () => {
    const spy = vi.fn();
    render(<Wrapper initial={makeData()} spy={spy} />);
    expect(screen.queryByText(/Razem:/)).toBeNull();

    fireEvent.click(toggleSwitch());
    expect(screen.getByText(/Razem:/)).toBeTruthy();
    expect(spy.mock.calls[0][0].timesheet).toHaveLength(7);

    fireEvent.click(toggleSwitch());
    expect(screen.queryByText(/Razem:/)).toBeNull();
    expect(spy.mock.calls[1][0].timesheet).toBeUndefined();
  });

  it('does nothing when the period is invalid', () => {
    const spy = vi.fn();
    render(
      <Wrapper
        initial={makeData({
          periodStart: '2025-03-09',
          periodEnd: '2025-03-01',
        })}
        spy={spy}
      />,
    );
    fireEvent.click(toggleSwitch());
    expect(spy).not.toHaveBeenCalled();
  });

  it('fills workdays, edits hours and changes day type', () => {
    render(<Wrapper initial={makeData()} />);
    fireEvent.click(toggleSwitch());
    fireEvent.click(screen.getByRole('button', { name: /dni robocze/ }));
    expect(screen.getByText(/Razem:\s*40\s*h/)).toBeTruthy();

    const hours = screen.getByLabelText('Godziny 2025-03-03');
    fireEvent.change(hours, { target: { value: '4' } });
    expect(screen.getByText(/Razem:\s*36\s*h/)).toBeTruthy();

    fireEvent.change(hours, { target: { value: '' } });
    expect(screen.getByText(/Razem:\s*32\s*h/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Rodzaj dnia 2025-03-04'), {
      target: { value: 'sick' },
    });
    expect(screen.getByText(/Razem:\s*24\s*h/)).toBeTruthy();
    expect(
      (screen.getByLabelText('Godziny 2025-03-04') as HTMLInputElement)
        .disabled,
    ).toBe(true);
  });

  it('treats an empty hours value as zero', () => {
    const spy = vi.fn();
    const days: TimesheetDay[] = [
      { date: '2025-03-03', type: 'work', hours: 8 },
    ];
    render(
      <TimesheetEditor
        data={makeData({
          periodStart: '2025-03-03',
          periodEnd: '2025-03-03',
          timesheet: days,
        })}
        onChange={spy}
      />,
    );
    const input = screen.getByLabelText('Godziny 2025-03-03');
    fireEvent.change(input, { target: { value: '' } });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('syncs days when the period changes, preserving entries', () => {
    const spy = vi.fn();
    const days: TimesheetDay[] = [
      { date: '2025-03-03', type: 'work', hours: 5 },
      { date: '2025-03-04', type: 'work', hours: 6 },
    ];
    const base = makeData({
      periodStart: '2025-03-03',
      periodEnd: '2025-03-04',
      timesheet: days,
    });
    const { rerender } = render(<TimesheetEditor data={base} onChange={spy} />);
    expect(spy).not.toHaveBeenCalled();

    rerender(
      <TimesheetEditor
        data={{ ...base, periodEnd: '2025-03-05' }}
        onChange={spy}
      />,
    );
    const synced = spy.mock.calls[0][0].timesheet as TimesheetDay[];
    expect(synced).toHaveLength(3);
    expect(synced[0].hours).toBe(5);
    expect(synced[2].hours).toBe(0);
  });

  it('skips syncing for an invalid new period or without days', () => {
    const spy = vi.fn();
    const base = makeData({
      periodStart: '2025-03-03',
      periodEnd: '2025-03-04',
      timesheet: [
        { date: '2025-03-03', type: 'work', hours: 5 },
        { date: '2025-03-04', type: 'work', hours: 5 },
      ],
    });
    const { rerender } = render(<TimesheetEditor data={base} onChange={spy} />);
    rerender(
      <TimesheetEditor
        data={{ ...base, periodEnd: '2025-03-01' }}
        onChange={spy}
      />,
    );
    rerender(
      <TimesheetEditor
        data={{ ...base, timesheet: undefined, periodEnd: '2025-03-06' }}
        onChange={spy}
      />,
    );
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not change anything when regenerated days are identical', () => {
    const spy = vi.fn();
    const base = makeData({
      periodStart: '2025-03-03',
      periodEnd: '2025-03-04',
      timesheet: [{ date: '2025-03-03', type: 'work', hours: 5 }],
    });
    const { rerender } = render(
      <TimesheetEditor data={base} onChange={vi.fn()} />,
    );
    rerender(
      <TimesheetEditor
        data={{ ...base, periodEnd: '2025-03-03' }}
        onChange={spy}
      />,
    );
    expect(spy).not.toHaveBeenCalled();
  });
});
