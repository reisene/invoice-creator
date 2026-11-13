'use client';

import {
  DAY_TYPE_LABELS,
  DAY_TYPES,
  fillWorkdays,
  generateTimesheetDays,
  setDayType,
  sumTimesheetHours,
} from '@/lib/invoice/timesheet';
import type {
  DayType,
  InvoiceFormData,
  TimesheetDay,
} from '@/types/invoiceForm';
import { useEffect } from 'react';
import { Button, Form, Table } from 'react-bootstrap';

interface TimesheetEditorProps {
  data: InvoiceFormData;
  onChange: (data: InvoiceFormData) => void;
}

function withDays(data: InvoiceFormData, days: TimesheetDay[]) {
  return { ...data, timesheet: days, hoursWorked: sumTimesheetHours(days) };
}

export function TimesheetEditor({ data, onChange }: TimesheetEditorProps) {
  const days = data.timesheet;
  const enabled = !!days && days.length > 0;

  // Keep the days in sync with the billing period, preserving entries by date.
  useEffect(() => {
    if (!days || days.length === 0) return;
    const generated = generateTimesheetDays(data.periodStart, data.periodEnd);
    if (generated.length === 0) return;
    const same =
      generated.length === days.length &&
      generated.every((day, i) => day.date === days[i].date);
    if (same) return;
    const existing = new Map(days.map((day) => [day.date, day]));
    onChange(
      withDays(
        data,
        generated.map((day) => existing.get(day.date) ?? day),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.periodStart, data.periodEnd]);

  const toggle = (checked: boolean) => {
    if (!checked) {
      onChange({ ...data, timesheet: undefined });
      return;
    }
    const generated = generateTimesheetDays(data.periodStart, data.periodEnd);
    if (generated.length === 0) return;
    onChange(withDays(data, generated));
  };

  const updateHours = (index: number, value: string) => {
    const hours = value === '' ? 0 : Number(value);
    if (!days || Number.isNaN(hours)) return;
    onChange(
      withDays(
        data,
        days.map((day, i) => (i === index ? { ...day, hours } : day)),
      ),
    );
  };

  return (
    <div className='mb-3'>
      <Form.Check
        type='switch'
        id='timesheet-switch'
        label='Wykaz godzin (dzień po dniu)'
        checked={enabled}
        onChange={(e) => {
          toggle(e.target.checked);
        }}
        aria-describedby='timesheet-help'
      />
      <Form.Text id='timesheet-help' muted>
        Suma godzin pracy zastąpi liczbę godzin. Rodzaj dnia (L4, urlop) ma
        charakter informacyjny — zasiłek chorobowy rozlicza się poza rachunkiem.
      </Form.Text>

      {enabled && days && (
        <>
          <div className='d-flex align-items-center gap-2 my-2'>
            <Button
              type='button'
              size='sm'
              variant='outline-primary'
              onClick={() => {
                onChange(withDays(data, fillWorkdays(days, 8)));
              }}
            >
              Wypełnij dni robocze (8 h)
            </Button>
            <strong aria-live='polite'>
              Razem: {sumTimesheetHours(days)} h
            </strong>
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            <Table size='sm' bordered>
              <caption className='visually-hidden'>Wykaz godzin</caption>
              <thead>
                <tr>
                  <th scope='col'>Data</th>
                  <th scope='col'>Rodzaj dnia</th>
                  <th scope='col'>Godziny</th>
                </tr>
              </thead>
              <tbody>
                {days.map((day, index) => (
                  <tr key={day.date}>
                    <th scope='row'>{day.date}</th>
                    <td>
                      <Form.Select
                        size='sm'
                        aria-label={`Rodzaj dnia ${day.date}`}
                        value={day.type}
                        onChange={(e) => {
                          onChange(
                            withDays(
                              data,
                              setDayType(
                                days,
                                index,
                                e.target.value as DayType,
                              ),
                            ),
                          );
                        }}
                      >
                        {DAY_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {DAY_TYPE_LABELS[type]}
                          </option>
                        ))}
                      </Form.Select>
                    </td>
                    <td>
                      <Form.Control
                        size='sm'
                        type='number'
                        min={0}
                        max={24}
                        step='0.25'
                        aria-label={`Godziny ${day.date}`}
                        disabled={day.type !== 'work'}
                        value={day.hours}
                        onChange={(e) => {
                          updateHours(index, e.target.value);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
