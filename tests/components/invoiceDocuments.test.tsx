// @vitest-environment node
import { calculateInvoice } from '@/lib/invoice/calculateInvoice';
import { DEFAULT_TAX_PARAMS } from '@/lib/invoice/taxConstants';
import { SAMPLE_INVOICE_PRESETS } from '@/lib/sampleInvoices';
import type { InvoiceFormData } from '@/types/invoiceForm';
import { type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { testing } from '../app/dom';
import { formData } from './fixtures';

const fonts = vi.hoisted(() => vi.fn());
vi.mock('@react-pdf/renderer', () => ({
  Font: { register: fonts },
  StyleSheet: { create: (styles: unknown) => styles },
  Document: ({
    children,
    title,
    language,
  }: {
    children: ReactNode;
    title: string;
    language: string;
  }) => (
    <article aria-label={title} lang={language}>
      {children}
    </article>
  ),
  Page: ({ children }: { children: ReactNode }) => (
    <section>{children}</section>
  ),
  View: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Text: ({
    children,
    render,
    style,
  }: {
    children?: ReactNode;
    render?: (props: { pageNumber: number; totalPages: number }) => ReactNode;
    style?: { fontFamily?: string };
  }) => (
    <span data-font={style?.fontFamily}>
      {render ? render({ pageNumber: 1, totalPages: 2 }) : children}
    </span>
  ),
}));
const [{ default: InvoicePreview }, { default: createDocument }] =
  await Promise.all([
    import('@/components/generator/InvoicePreview'),
    import('@/components/generator/InvoicePdfDocument'),
  ]);
const { cleanup, render, screen } = testing;
const registeredFonts = fonts.mock.calls.map(([font]) => font);
afterEach(cleanup);

describe.each(['preview', 'PDF'] as const)('%s invoice content', (kind) => {
  function mount(data: InvoiceFormData, number?: string) {
    const invoice = calculateInvoice(data, DEFAULT_TAX_PARAMS);
    return render(
      kind === 'preview' ? (
        <InvoicePreview
          data={invoice}
          taxParams={DEFAULT_TAX_PARAMS}
          invoiceNumber={number}
        />
      ) : (
        createDocument(invoice, number ?? 'R/2026/1')
      ),
    );
  }
  it.each(SAMPLE_INVOICE_PRESETS)(
    'shows real calculated amounts and parties for $id',
    (preset) => {
      const invoice = calculateInvoice(preset.formData, DEFAULT_TAX_PARAMS);
      const { container } = mount(preset.formData, 'R/2026/7');
      const text = container.textContent!;
      expect(text).toContain('R/2026/7');
      expect(text).toContain(preset.formData.clientName);
      expect(text).toContain(preset.formData.contractorName);
      expect(text).toContain('Podpis zleceniodawcy');
      expect(text).toContain('Podpis zleceniobiorcy');
      expect(text).toContain(
        invoice.calculations.net
          .toFixed(2)
          .replace('.', kind === 'PDF' ? ',' : '.'),
      );
      expect(text).toContain('31.03.2026');
      if (preset.formData.youngRelief)
        expect(text).toContain('Przychód zwolniony');
    },
  );
  it.each([
    { paymentMethod: 'CASH', transferTarget: '' },
    { paymentMethod: 'TRANSFER', transferTarget: 'DECLARATION' },
    { paymentMethod: '', transferTarget: '' },
    {
      paymentMethod: 'TRANSFER',
      transferTarget: 'SAVED_ACCOUNT',
      bankAccountNumber: undefined,
      bankName: undefined,
      bankAccountHolder: undefined,
    },
  ] satisfies Partial<InvoiceFormData>[])(
    'renders payment variation $paymentMethod / $transferTarget',
    (payment) => {
      const { container } = mount(
        formData({
          ...payment,
          noTaxAdvanceRequest: true,
          taxReduction: true,
          notes: undefined,
          contractNumber: 'UZ/42',
          issueDate: 'legacy-date',
          clientType: 'private',
          clientPesel: '90010112349',
          contractorNip: '5250001003',
        }),
      );
      expect(container.textContent).toContain('UZ/42');
      expect(container.textContent).toContain('PESEL: 90010112349');
      expect(container.textContent).toContain('NIP: 5250001003');
      expect(container.textContent).toContain('legacy-date');
      expect(container.textContent).toContain(
        'Podstawa opodatkowana powyżej 30 000 zł',
      );
      expect(container.textContent).not.toContain(
        'Zaliczka na PIT przed zmniejszeniem',
      );
      const expected =
        payment.paymentMethod === 'CASH'
          ? 'Gotówka'
          : payment.transferTarget === 'DECLARATION'
            ? 'zgodnie ze złożonym oświadczeniem'
            : payment.paymentMethod
              ? 'Przelew na rachunek bankowy'
              : 'Nie wybrano formy wypłaty.';
      expect(container.textContent).toContain(expected);
    },
  );
  it('omits missing identifiers, date and number and supports partial hourly values', () => {
    const { container, unmount } = mount(
      formData({
        clientNip: undefined,
        contractorNip: undefined,
        issuePlace: undefined,
        issueDate: undefined,
        taxReduction: false,
        hourlyRate: 50,
        hoursWorked: undefined,
      }),
    );
    expect(container.textContent).not.toContain('NIP:');
    expect(container.textContent).not.toContain(
      'Zaliczka na PIT przed zmniejszeniem',
    );
    if (kind === 'preview')
      expect(container.textContent).toContain(
        'zostanie nadany przy pobieraniu PDF',
      );
    unmount();
    const privateInvoice = mount(
      formData({
        clientType: 'private',
        clientPesel: undefined,
        taxReduction: false,
        notes: '',
      }),
    );
    expect(privateInvoice.container.textContent).not.toContain(
      'PESEL: undefined',
    );
  });
  it('preserves Polish and mixed-script characters in the output', () => {
    const { container } = mount(
      formData({
        contractorName: 'Łukasz Żółć AąBé€',
        notes: 'ASCII — 中文 😀',
      }),
    );
    expect(container.textContent).toContain('Łukasz Żółć AąBé€');
    expect(container.textContent).toContain('ASCII — 中文 😀');
    if (kind === 'PDF') {
      expect(registeredFonts).toEqual([
        expect.objectContaining({ family: 'Noto Sans Latin', fontWeight: 400 }),
        expect.objectContaining({ family: 'Noto Sans Latin', fontWeight: 700 }),
        expect.objectContaining({
          family: 'Noto Sans Latin Ext',
          fontWeight: 400,
        }),
        expect.objectContaining({
          family: 'Noto Sans Latin Ext',
          fontWeight: 700,
        }),
      ]);
      expect(
        container.querySelector('[data-font="Noto Sans Latin Ext"]'),
      ).not.toBeNull();
      expect(
        container.querySelector('[data-font="Noto Sans Latin"]'),
      ).not.toBeNull();
      expect(screen.getByText('Strona 1 z 2')).toBeDefined();
    }
  });
});
