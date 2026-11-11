// @vitest-environment node
import {
  generatorDraftKey,
  INVOICE_UID_PATTERN,
  parseGeneratorDraft,
  parseGeneratorPreset,
} from '@/lib/invoice/generatorDraft';
import { describe, expect, it } from 'vitest';
import { formData } from '../components/fixtures';

const uid = 'd92da4c7-c999-4856-96d6-7681b1b96f71';
const draft = { version: 1, formData: formData() };
const parse = (value: unknown) => parseGeneratorDraft(JSON.stringify(value));

describe('generator draft serialization', () => {
  it('isolates user scopes and document contexts', () => {
    expect(generatorDraftKey('anonymous', 'new')).toBe(
      'generator_draft_v1:anonymous:new',
    );
    expect(generatorDraftKey('user-a', 'new')).not.toBe(
      generatorDraftKey('user-b', 'new'),
    );
    expect(generatorDraftKey('user-a', 'new')).not.toBe(
      generatorDraftKey('user-a', 'invoice:1'),
    );
    expect(INVOICE_UID_PATTERN.test(uid.toUpperCase())).toBe(true);
    expect(INVOICE_UID_PATTERN.test('invalid')).toBe(false);
  });

  it('restores version metadata, creation identity and number reservation', () => {
    const value = {
      ...draft,
      invoiceId: 'invoice-1',
      updatedAt: '2026-10-21T00:00:00.000Z',
      invoiceNumber: '1/2026',
      numberReservation: { number: '1/2026', token: 'signed' },
      creationUid: uid,
      untrusted: 'discard',
    };
    expect(parse(value)).toEqual({
      ...value,
      untrusted: undefined,
      formData: { ...formData(), yearToDateEmploymentIncome: 0 },
    });
  });

  it.each([
    null,
    [],
    {},
    { ...draft, version: 2 },
    { ...draft, formData: {} },
    { ...draft, invoiceId: '' },
    { ...draft, invoiceId: 'x'.repeat(101) },
    { ...draft, invoiceId: 'missing-version' },
    { ...draft, invoiceNumber: 1 },
    { ...draft, invoiceNumber: 'x'.repeat(101) },
    { ...draft, updatedAt: 'invalid' },
    { ...draft, updatedAt: 123 },
    { ...draft, creationUid: 'invalid' },
    { ...draft, numberReservation: null },
    { ...draft, numberReservation: { number: '1/2026', token: 'signed' } },
    {
      ...draft,
      invoiceNumber: '1/2026',
      numberReservation: { number: '2/2026', token: 'signed' },
    },
    {
      ...draft,
      invoiceNumber: '1/2026',
      numberReservation: { number: '1/2026', token: 1 },
    },
  ])('rejects invalid structure or metadata %#', (value) => {
    expect(parse(value)).toBeNull();
  });

  it('preserves incomplete, overlength and out-of-range edits without accepting invalid types', () => {
    const form = formData({
      clientName: 'x'.repeat(250),
      contractorPesel: '',
      periodStart: '',
      grossAmount: -1,
      notes: 'x'.repeat(2100),
    });
    expect(parse({ ...draft, formData: form })?.formData).toMatchObject(form);
    expect(
      parse({ ...draft, formData: { ...form, youngRelief: 'yes' } }),
    ).toBeNull();
    expect(
      parse({ ...draft, formData: { ...form, grossAmount: '100' } }),
    ).toBeNull();
  });

  it('surfaces malformed JSON for the caller to report', () => {
    expect(() => parseGeneratorDraft('{')).toThrow(SyntaxError);
    expect(() => parseGeneratorPreset('{', formData())).toThrow(SyntaxError);
  });

  it('merges presets with defaults and rejects unusable presets', () => {
    expect(
      parseGeneratorPreset('{"grossAmount":7000}', formData()),
    ).toMatchObject({
      ...formData(),
      grossAmount: 7000,
    });
    for (const raw of ['null', '[]', '"text"', '{"contractType":"bad"}'])
      expect(parseGeneratorPreset(raw, formData())).toBeNull();
  });
});
