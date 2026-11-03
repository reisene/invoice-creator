// @vitest-environment node
import { calculateInvoice } from '@/lib/invoice/calculateInvoice';
import { DEFAULT_TAX_PARAMS } from '@/lib/invoice/taxConstants';
import { validateInvoiceForm } from '@/lib/invoice/validateInvoiceForm';
import type { InvoiceFormData } from '@/types/invoiceForm';
import type { SavedPartyDto } from '@/types/savedData';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { testing } from '../app/dom';
import { bankAccount, formData } from './fixtures';

type FormProps = ComponentProps<
  typeof import('@/components/generator/InvoiceForm').default
>;
type PreviewProps = ComponentProps<
  typeof import('@/components/generator/InvoicePreview').default
>;
type PartiesProps = ComponentProps<
  typeof import('@/components/generator/SavedPartiesPanel').default
>;
const mocks = vi.hoisted(() => ({
  income: vi.fn(),
  snapshot: vi.fn(),
  save: vi.fn(),
  reserve: vi.fn(),
  pdf: vi.fn(),
  blob: vi.fn(),
  document: vi.fn(),
  capture: vi.fn(),
  tag: vi.fn(),
  form: vi.fn(),
  preview: vi.fn(),
  parties: vi.fn(),
  patch: {} as Partial<InvoiceFormData>,
  createUrl: vi.fn(),
  revokeUrl: vi.fn(),
}));
vi.mock('@/app/actions/savedData', () => ({
  getYearToDateInvoiceTaxableIncome: mocks.income,
  saveInvoice: mocks.save,
  reserveInvoiceNumber: mocks.reserve,
  getSavedInvoiceSnapshot: mocks.snapshot,
}));
vi.mock('@/components/generator/InvoiceForm', () => ({ default: mocks.form }));
vi.mock('@/components/generator/InvoicePreview', () => ({
  default: mocks.preview,
}));
vi.mock('@/components/generator/SavedPartiesPanel', () => ({
  default: mocks.parties,
}));
vi.mock('@/components/generator/InvoicePdfDocument', () => ({
  default: mocks.document,
}));
vi.mock('@react-pdf/renderer', () => ({ pdf: mocks.pdf }));
vi.mock('@sentry/nextjs', () => ({
  captureException: mocks.capture,
  withScope: (fn: (scope: { setTag: typeof mocks.tag }) => void) =>
    fn({ setTag: mocks.tag }),
}));
const { default: GeneratorClient } =
  await import('@/components/generator/GeneratorClient');
const { act, cleanup, fireEvent, render, screen, waitFor } = testing;
const party: SavedPartyDto = {
  id: 'new-party',
  kind: 'CLIENT',
  label: 'Client',
  clientType: 'company',
  name: 'Client',
  address: 'Address',
  nip: null,
  pesel: null,
};
const baseProps = {
  taxParams: [DEFAULT_TAX_PARAMS],
  signedIn: false,
  initialParties: [],
  bankAccount: null,
  draftScope: 'test-user',
  draftContext: 'new',
};
const updatedAt = '2026-10-21T00:00:00.000Z';
beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/generator');
  mocks.patch = {};
  mocks.income.mockResolvedValue({ ok: true, data: 0 });
  mocks.snapshot.mockResolvedValue({ ok: true, data: null });
  mocks.save.mockResolvedValue({
    ok: true,
    data: {
      id: 'saved-id',
      invoiceNumber: 'R/2026/1',
      updatedAt,
      savedInvoiceTaxableIncome: 0,
    },
  });
  mocks.reserve.mockResolvedValue({
    ok: true,
    data: { number: 'R/2026/2', token: 'signed-token' },
  });
  mocks.form.mockImplementation((props: FormProps) => (
    <div>
      <output data-testid='form'>{JSON.stringify(props.data)}</output>
      <output data-testid='income'>
        {JSON.stringify({
          income: props.savedInvoiceTaxableIncome,
          loading: props.isLoadingSavedIncome,
          error: props.savedIncomeError,
        })}
      </output>
      <output data-testid='bank'>{JSON.stringify(props.bankAccount)}</output>
      <button onClick={() => props.onChange({ ...props.data, ...mocks.patch })}>
        Edit form
      </button>
      <button onClick={() => props.onBankAccountSaved?.(bankAccount)}>
        Save bank
      </button>
    </div>
  ));
  mocks.preview.mockImplementation((props: PreviewProps) => (
    <output data-testid='preview'>{JSON.stringify(props)}</output>
  ));
  mocks.parties.mockImplementation((props: PartiesProps) => (
    <div>
      <output data-testid='parties'>{JSON.stringify(props.parties)}</output>
      <button onClick={() => props.onSaved(party)}>Save party</button>
      <button onClick={() => props.onChange(formData())}>Apply party</button>
    </div>
  ));
  mocks.pdf.mockReturnValue({ toBlob: mocks.blob });
  mocks.document.mockReturnValue('pdf-document');
  mocks.blob.mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));
  mocks.createUrl.mockReturnValue('blob:test-invoice');
  vi.stubGlobal(
    'URL',
    Object.assign(class extends URL {}, {
      createObjectURL: mocks.createUrl,
      revokeObjectURL: mocks.revokeUrl,
    }),
  );
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(async () => {
  if (mocks.createUrl.mock.calls.length > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, 1100));
  }
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function storedData(): InvoiceFormData {
  return JSON.parse(screen.getByTestId('form').textContent!);
}
function edit(patch: Partial<InvoiceFormData>) {
  mocks.patch = patch;
  fireEvent.click(screen.getByRole('button', { name: 'Edit form' }));
}
async function ready() {
  await waitFor(() =>
    expect(screen.getByTestId('income').textContent).toContain(
      '"loading":false',
    ),
  );
}
function storeDraft(draft: object, context = 'new') {
  sessionStorage.setItem(
    `generator_draft_v1:test-user:${context}`,
    JSON.stringify({ version: 1, ...draft }),
  );
}
async function closeDialogWith(name: string) {
  fireEvent.click(screen.getByRole('button', { name }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
}
const existingInvoice = {
  id: 'existing',
  updatedAt,
  invoiceNumber: 'R/old',
  data: formData(),
};

describe('generator initialization and saved data', () => {
  it('starts with local dates, formatted bank data and validation preventing downloads', () => {
    render(<GeneratorClient {...baseProps} bankAccount={bankAccount} />);
    const initial = storedData();
    expect(initial.issueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(initial.periodStart.endsWith('-01')).toBe(true);
    expect(initial.bankAccountNumber).toBe('61 1090 1014 0000 0712 1981 2874');
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Pobierz PDF' })
        .disabled,
    ).toBe(true);
    expect(screen.getByText('Aby pobrać PDF, popraw:')).toBeDefined();
    expect(mocks.income).not.toHaveBeenCalled();
    expect(
      screen.getByRole('link', { name: 'Zaloguj się' }).getAttribute('href'),
    ).toBe('/auth/sign-in');
  });
  it('restores and consumes a preset, fills missing issue date and keeps defaults', () => {
    sessionStorage.setItem(
      'generator_preset_data',
      JSON.stringify({ grossAmount: 7000 }),
    );
    render(<GeneratorClient {...baseProps} />);
    expect(storedData()).toMatchObject({
      grossAmount: 7000,
      contractorStatus: 'standard',
      clientType: 'company',
    });
    expect(storedData().issueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(sessionStorage.getItem('generator_preset_data')).toBeNull();
  });
  it.each(['invalid JSON', 'null', '"string"'])(
    'ignores unusable preset %s',
    (preset) => {
      sessionStorage.setItem('generator_preset_data', preset);
      render(<GeneratorClient {...baseProps} />);
      expect(storedData().grossAmount).toBeUndefined();
    },
  );
  it('keeps a valid preset issue date and tolerates storage failure', () => {
    sessionStorage.setItem('generator_preset_data', JSON.stringify(formData()));
    const first = render(<GeneratorClient {...baseProps} />);
    expect(storedData()).toEqual({
      ...formData(),
      yearToDateEmploymentIncome: 0,
    });
    first.unmount();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<GeneratorClient {...baseProps} />);
    expect(storedData().clientName).toBe('');
  });
  it('prefers an existing invoice over duplication and presets', async () => {
    sessionStorage.setItem(
      'generator_preset_data',
      JSON.stringify({ grossAmount: 1 }),
    );
    render(
      <GeneratorClient
        {...baseProps}
        signedIn
        draftContext='invoice:existing'
        initialInvoice={{
          id: 'existing',
          updatedAt,
          invoiceNumber: 'R/old',
          data: formData(),
        }}
        duplicateData={formData({ grossAmount: 2 })}
      />,
    );
    await ready();
    expect(storedData()).toEqual(formData());
    expect(mocks.income).toHaveBeenCalledWith(
      formData().periodStart,
      formData().contractorPesel,
      'existing',
    );
    expect(
      screen.getByRole('button', { name: 'Zaktualizuj rachunek' }),
    ).toBeDefined();
    expect(sessionStorage.getItem('generator_preset_data')).not.toBeNull();
  });
  it('duplicates data with a new issue date and without reusing the saved invoice id', () => {
    render(
      <GeneratorClient
        {...baseProps}
        duplicateData={formData({ issueDate: '2000-01-01' })}
      />,
    );
    expect(storedData().grossAmount).toBe(5000);
    expect(storedData().issueDate).not.toBe('2000-01-01');
  });
  it('wires saved parties and bank updates to the form', async () => {
    render(
      <GeneratorClient {...baseProps} signedIn duplicateData={formData()} />,
    );
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Save party' }));
    expect(JSON.parse(screen.getByTestId('parties').textContent!)).toEqual([
      party,
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Apply party' }));
    expect(storedData()).toEqual(formData());
    fireEvent.click(screen.getByRole('button', { name: 'Save bank' }));
    expect(JSON.parse(screen.getByTestId('bank').textContent!)).toEqual(
      bankAccount,
    );
  });
  it('shows missing tax parameters rather than an invalid preview', () => {
    render(<GeneratorClient {...baseProps} taxParams={[]} />);
    expect(screen.getByRole('alert').textContent).toContain(
      'Brak parametrów podatkowych',
    );
    expect(screen.queryByTestId('preview')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pobierz PDF' })).toBeNull();
  });
});

describe('annual income synchronization', () => {
  it('disables save/PDF while loading and incorporates saved annual income', async () => {
    let resolve!: (result: { ok: true; data: number }) => void;
    mocks.income.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    render(
      <GeneratorClient
        {...baseProps}
        signedIn
        duplicateData={formData({ yearToDateTaxableIncome: 100 })}
      />,
    );
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Zapisz rachunek' })
        .disabled,
    ).toBe(true);
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Pobierz PDF' })
        .disabled,
    ).toBe(true);
    await waitFor(() => expect(mocks.income).toHaveBeenCalledOnce());
    await act(async () => {
      resolve({ ok: true, data: 120000 });
    });
    await ready();
    expect(storedData().yearToDateTaxableIncome).toBe(100);
    expect(mocks.preview.mock.lastCall?.[0].data).toEqual(
      calculateInvoice(
        { ...storedData(), yearToDateTaxableIncome: 120100 },
        DEFAULT_TAX_PARAMS,
      ),
    );
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Zapisz rachunek' })
        .disabled,
    ).toBe(false);
  });
  it.each(['returned', 'thrown'])(
    'blocks save and PDF after %s income failure',
    async (type) => {
      const error = new Error('network');
      if (type === 'returned')
        mocks.income.mockResolvedValue({ ok: false, error: 'Denied' });
      else mocks.income.mockRejectedValue(error);
      render(
        <GeneratorClient {...baseProps} signedIn duplicateData={formData()} />,
      );
      await ready();
      expect(screen.getByTestId('income').textContent).toContain(
        type === 'returned' ? 'Denied' : 'Nie udało się zsumować',
      );
      expect(
        screen.getByRole<HTMLButtonElement>('button', { name: 'Pobierz PDF' })
          .disabled,
      ).toBe(true);
      expect(
        screen.getByRole<HTMLButtonElement>('button', {
          name: 'Zapisz rachunek',
        }).disabled,
      ).toBe(true);
      if (type === 'thrown') expect(mocks.capture).toHaveBeenCalledWith(error);
    },
  );
  it('ignores stale results after year changes and reloads current income', async () => {
    let stale!: (result: { ok: true; data: number }) => void;
    mocks.income
      .mockReturnValueOnce(
        new Promise((done) => {
          stale = done;
        }),
      )
      .mockResolvedValueOnce({ ok: true, data: 500 });
    render(
      <GeneratorClient {...baseProps} signedIn duplicateData={formData()} />,
    );
    await waitFor(() => expect(mocks.income).toHaveBeenCalledOnce());
    edit({ periodStart: '2027-01-01', periodEnd: '2027-01-31' });
    await ready();
    await act(async () => {
      stale({ ok: true, data: 9999 });
    });
    expect(screen.getByTestId('income').textContent).toContain('"income":500');
    expect(mocks.income).toHaveBeenLastCalledWith(
      '2027-01-01',
      formData().contractorPesel,
      undefined,
    );
  });
  it('reports a rejected request even after unmount without updating state', async () => {
    let reject!: (reason: Error) => void;
    const error = new Error('late');
    mocks.income.mockReturnValue(
      new Promise((_, fail) => {
        reject = fail;
      }),
    );
    const { unmount } = render(
      <GeneratorClient {...baseProps} signedIn duplicateData={formData()} />,
    );
    await waitFor(() => expect(mocks.income).toHaveBeenCalledOnce());
    unmount();
    await act(async () => {
      reject(error);
    });
    expect(mocks.capture).toHaveBeenCalledWith(error);
  });
});

describe('saving invoices and downloading PDF', () => {
  it.each(['invoice-only', 'profile'] as const)(
    'asks before changing a different profile account and respects %s',
    async (choice) => {
      const differentAccount = { ...bankAccount, bankName: 'Another bank' };
      render(
        <GeneratorClient
          {...baseProps}
          signedIn
          bankAccount={differentAccount}
          duplicateData={formData()}
        />,
      );
      await ready();
      fireEvent.click(screen.getByRole('button', { name: 'Zapisz rachunek' }));
      expect(mocks.save).not.toHaveBeenCalled();
      const dialog = await screen.findByRole('dialog');
      expect(dialog.textContent).toContain('profil');
      fireEvent.click(
        screen.getByRole('button', {
          name:
            choice === 'profile'
              ? 'Zapisz i zmień profil'
              : 'Zapisz tylko rachunek',
        }),
      );
      await screen.findByText('Rachunek zapisany.');
      expect(mocks.save).toHaveBeenCalledWith(
        expect.any(Object),
        undefined,
        undefined,
        choice === 'profile',
        0,
        undefined,
        expect.stringMatching(/^[0-9a-f-]{36}$/),
      );
      expect(JSON.parse(screen.getByTestId('bank').textContent!)).toEqual(
        choice === 'profile' ? bankAccount : differentAccount,
      );
    },
  );

  it('reuses the creation identity after an interrupted response', async () => {
    mocks.save.mockRejectedValueOnce(new Error('interrupted'));
    render(
      <GeneratorClient
        {...baseProps}
        signedIn
        bankAccount={bankAccount}
        duplicateData={formData()}
      />,
    );
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz rachunek' }));
    await screen.findByText(
      'Nie udało się zapisać rachunku. Spróbuj ponownie.',
    );
    const firstIdentity = mocks.save.mock.calls[0][6];
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz rachunek' }));
    await screen.findByText('Rachunek zapisany.');
    expect(mocks.save.mock.calls[1][6]).toBe(firstIdentity);
  });

  it('blocks new saves if their identity cannot be persisted in this tab', async () => {
    render(
      <GeneratorClient
        {...baseProps}
        signedIn
        bankAccount={bankAccount}
        duplicateData={formData()}
      />,
    );
    await ready();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz rachunek' }));
    await screen.findByText(/Nie można zabezpieczyć nowego rachunku/);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it.each(['CASH', 'TRANSFER'] as const)(
    'saves a new %s invoice, then updates it',
    async (paymentMethod) => {
      const data = formData({
        paymentMethod,
        transferTarget: paymentMethod === 'CASH' ? '' : 'SAVED_ACCOUNT',
        yearToDateEmploymentIncome: 0,
      });
      expect(validateInvoiceForm(data, DEFAULT_TAX_PARAMS)).toEqual([]);
      sessionStorage.setItem('generator_preset_data', JSON.stringify(data));
      let finish!: (result: {
        ok: true;
        data: {
          id: string;
          invoiceNumber: string;
          updatedAt: string;
          savedInvoiceTaxableIncome: number;
        };
      }) => void;
      mocks.save
        .mockReturnValueOnce(
          new Promise((done) => {
            finish = done;
          }),
        )
        .mockResolvedValueOnce({
          ok: true,
          data: {
            id: 'saved-id',
            invoiceNumber: 'R/2026/1',
            updatedAt,
            savedInvoiceTaxableIncome: 0,
          },
        });
      render(<GeneratorClient {...baseProps} signedIn />);
      await ready();
      fireEvent.click(screen.getByRole('button', { name: 'Zapisz rachunek' }));
      if (paymentMethod === 'TRANSFER')
        fireEvent.click(
          screen.getByRole('button', {
            name: 'Zapisz i dodaj konto w profilu',
          }),
        );
      expect(
        screen.getByRole<HTMLButtonElement>('button', { name: 'Zapisywanie…' })
          .disabled,
      ).toBe(true);
      expect(mocks.save).toHaveBeenCalledWith(
        data,
        undefined,
        undefined,
        paymentMethod === 'TRANSFER',
        0,
        undefined,
        expect.any(String),
      );
      await act(async () => {
        finish({
          ok: true,
          data: {
            id: 'saved-id',
            invoiceNumber: 'R/2026/1',
            updatedAt,
            savedInvoiceTaxableIncome: 0,
          },
        });
      });
      expect(screen.getByText('Rachunek zapisany.')).toBeDefined();
      expect(JSON.parse(screen.getByTestId('bank').textContent!)).toEqual(
        paymentMethod === 'TRANSFER' ? bankAccount : null,
      );
      fireEvent.click(
        screen.getByRole('button', { name: 'Zaktualizuj rachunek' }),
      );
      await waitFor(() =>
        expect(mocks.save).toHaveBeenLastCalledWith(
          data,
          'saved-id',
          undefined,
          false,
          0,
          updatedAt,
          undefined,
        ),
      );
    },
  );
  it('displays returned save errors and reports thrown errors with a retry', async () => {
    const error = new Error('save failure');
    mocks.save
      .mockResolvedValueOnce({ ok: false, error: 'Rejected save' })
      .mockRejectedValueOnce(error);
    render(
      <GeneratorClient
        {...baseProps}
        bankAccount={bankAccount}
        signedIn
        duplicateData={formData()}
      />,
    );
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz rachunek' }));
    await screen.findByText('Rejected save');
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz rachunek' }));
    await screen.findByText(
      'Nie udało się zapisać rachunku. Spróbuj ponownie.',
    );
    expect(mocks.capture).toHaveBeenCalledWith(error);
    expect(mocks.tag).toHaveBeenCalledWith(
      'error.area',
      'generator.invoice.save',
    );
  });
  it('reserves a number only once, downloads a sanitized filename and reuses its token on save', async () => {
    mocks.reserve.mockResolvedValue({
      ok: true,
      data: { number: 'R/2026/2?ą', token: 'signed-token' },
    });
    render(
      <GeneratorClient
        {...baseProps}
        bankAccount={bankAccount}
        signedIn
        duplicateData={formData()}
      />,
    );
    await ready();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe('rachunek-R_2026_2__.pdf');
        expect(this.href).toBe('blob:test-invoice');
      });
    fireEvent.click(screen.getByRole('button', { name: 'Pobierz PDF' }));
    await waitFor(
      () => expect(mocks.revokeUrl).toHaveBeenCalledWith('blob:test-invoice'),
      { timeout: 2000 },
    );
    expect(click).toHaveBeenCalledOnce();
    expect(mocks.pdf).toHaveBeenCalledWith('pdf-document');
    expect(mocks.document.mock.lastCall?.[1]).toBe('R/2026/2?ą');
    expect(mocks.reserve).toHaveBeenCalledWith(new Date().getFullYear());
    fireEvent.click(screen.getByRole('button', { name: 'Pobierz PDF' }));
    await waitFor(() => expect(click).toHaveBeenCalledTimes(2));
    expect(mocks.reserve).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz rachunek' }));
    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith(
        expect.any(Object),
        undefined,
        { number: 'R/2026/2?ą', token: 'signed-token' },
        false,
        0,
        undefined,
        expect.any(String),
      ),
    );
    await screen.findByText('Rachunek zapisany.');
    fireEvent.click(
      screen.getByRole('button', { name: 'Zaktualizuj rachunek' }),
    );
    await waitFor(() =>
      expect(mocks.save).toHaveBeenLastCalledWith(
        expect.any(Object),
        'saved-id',
        undefined,
        false,
        0,
        updatedAt,
        undefined,
      ),
    );
  });
  it('uses an existing number and disables PDF while rendering', async () => {
    let complete!: (blob: Blob) => void;
    mocks.blob.mockReturnValue(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    render(
      <GeneratorClient
        {...baseProps}
        initialInvoice={{
          id: 'old',
          updatedAt,
          invoiceNumber: 'Existing/1',
          data: formData(),
        }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Pobierz PDF' }));
    await waitFor(() => expect(mocks.blob).toHaveBeenCalledOnce());
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: 'Generowanie PDF…',
      }).disabled,
    ).toBe(true);
    await act(async () => {
      complete(new Blob(['pdf']));
    });
    expect(mocks.reserve).not.toHaveBeenCalled();
    expect(mocks.document.mock.lastCall?.[1]).toBe('Existing/1');
  });
  it('displays reservation failure and can retry successfully', async () => {
    mocks.reserve
      .mockResolvedValueOnce({ ok: false, error: 'No number' })
      .mockResolvedValueOnce({
        ok: true,
        data: { number: 'R/next', token: 'token' },
      });
    render(<GeneratorClient {...baseProps} duplicateData={formData()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pobierz PDF' }));
    await screen.findByText('Nie udało się wygenerować PDF: No number');
    expect(mocks.blob).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Pobierz PDF' }));
    await waitFor(() => expect(mocks.blob).toHaveBeenCalledOnce());
    expect(
      screen.queryByText('Nie udało się wygenerować PDF: No number'),
    ).toBeNull();
  });
  it.each(['reservation', 'rendering'])(
    'reports thrown %s errors and restores PDF controls',
    async (area) => {
      const error = new Error(area);
      if (area === 'reservation') mocks.reserve.mockRejectedValue(error);
      else mocks.blob.mockRejectedValue(error);
      render(<GeneratorClient {...baseProps} duplicateData={formData()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Pobierz PDF' }));
      await screen.findByText(
        'Nie udało się wygenerować PDF: Nie udało się wygenerować pliku PDF.',
      );
      expect(mocks.capture).toHaveBeenCalledWith(error);
      expect(mocks.tag).toHaveBeenCalledWith(
        'error.area',
        'generator.invoice.pdf',
      );
      expect(
        screen.getByRole<HTMLButtonElement>('button', { name: 'Pobierz PDF' })
          .disabled,
      ).toBe(false);
    },
  );
});

describe('draft states, conflicts and dialogs', () => {
  it('lets a blocked draft be cleared only after confirmation', async () => {
    sessionStorage.setItem('generator_draft_v1:test-user:new', '{');
    render(<GeneratorClient {...baseProps} />);
    await screen.findByText(/Nie udało się odczytać wersji roboczej/);
    expect(screen.queryByTestId('form')).toBeNull();
    const openDialog = () =>
      fireEvent.click(
        screen.getByRole('button', {
          name: 'Usuń wersję roboczą i otwórz formularz',
        }),
      );
    openDialog();
    await closeDialogWith('Close');
    openDialog();
    await closeDialogWith('Anuluj');
    expect(sessionStorage.getItem('generator_draft_v1:test-user:new')).toBe(
      '{',
    );
    openDialog();
    await closeDialogWith('Usuń wersję roboczą');
    expect(
      screen.getByText(/Wersja robocza została usunięta z pamięci karty/),
    ).toBeDefined();
    expect(storedData().clientName).toBe('');
    expect(
      sessionStorage.getItem('generator_draft_v1:test-user:new'),
    ).toBeNull();
  });

  it('clears the draft of a ready form', async () => {
    render(<GeneratorClient {...baseProps} duplicateData={formData()} />);
    edit({ grossAmount: 4321 });
    expect(
      sessionStorage.getItem('generator_draft_v1:test-user:new'),
    ).not.toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Usuń wersję roboczą z tej karty' }),
    );
    await closeDialogWith('Usuń wersję roboczą');
    expect(
      sessionStorage.getItem('generator_draft_v1:test-user:new'),
    ).toBeNull();
    expect(
      screen.getByText(/Wersja robocza została usunięta z pamięci karty/),
    ).toBeDefined();
  });

  it.each([
    ['Wybierz wzorzec', 7000],
    ['Wybierz wersję roboczą', 1234],
  ])(
    'resolves a draft and preset conflict with "%s"',
    async (choice, grossAmount) => {
      storeDraft({ formData: formData({ grossAmount: 1234 }) });
      sessionStorage.setItem(
        'generator_preset_data',
        JSON.stringify({ grossAmount: 7000 }),
      );
      render(<GeneratorClient {...baseProps} />);
      const heading = await screen.findByRole('heading', {
        name: 'Wybierz wersję formularza',
      });
      expect(document.activeElement).toBe(heading);
      expect(heading.tabIndex).toBe(-1);
      expect(heading.parentElement?.textContent).toContain('wybrany wzorzec');
      fireEvent.click(screen.getByRole('button', { name: choice }));
      await waitFor(() => expect(storedData().grossAmount).toBe(grossAmount));
      expect(sessionStorage.getItem('generator_preset_data')).toBeNull();
    },
  );

  it.each([
    ['Wybierz zapisany rachunek', 5000],
    ['Wybierz wersję roboczą', 1234],
  ])(
    'resolves a conflict with a changed saved invoice using "%s"',
    async (choice, grossAmount) => {
      storeDraft(
        {
          formData: formData({ grossAmount: 1234 }),
          invoiceId: 'existing',
          invoiceNumber: 'R/old',
          updatedAt: '2026-10-01T00:00:00.000Z',
        },
        'invoice:existing',
      );
      render(
        <GeneratorClient
          {...baseProps}
          draftContext='invoice:existing'
          initialInvoice={existingInvoice}
        />,
      );
      const heading = await screen.findByRole('heading', {
        name: 'Wybierz wersję formularza',
      });
      expect(document.activeElement).toBe(heading);
      expect(heading.tabIndex).toBe(-1);
      expect(heading.parentElement?.textContent).toContain(
        'Istnieje zapisany rachunek',
      );
      fireEvent.click(screen.getByRole('button', { name: choice }));
      expect(storedData().grossAmount).toBe(grossAmount);
      expect(
        JSON.parse(screen.getByTestId('preview').textContent!).invoiceNumber,
      ).toBe('R/old');
    },
  );

  it.each([
    ['Odtwórz jako nowy rachunek', 1234],
    ['Odrzuć wersję roboczą', undefined],
  ])(
    'resolves a draft of a deleted invoice using "%s"',
    async (choice, grossAmount) => {
      let resolve!: (result: { ok: true; data: null }) => void;
      mocks.snapshot.mockReturnValue(
        new Promise((done) => {
          resolve = done;
        }),
      );
      storeDraft({
        formData: formData({ grossAmount: 1234 }),
        invoiceId: 'gone',
        invoiceNumber: 'R/gone',
        updatedAt,
      });
      render(<GeneratorClient {...baseProps} />);
      expect(screen.getByRole('status').textContent).toBe(
        'Odczytywanie wersji roboczej…',
      );
      await act(async () => {
        resolve({ ok: true, data: null });
      });
      expect(mocks.snapshot).toHaveBeenCalledWith('gone', false);
      expect(
        screen.getByRole('heading', { name: 'Wybierz wersję formularza' })
          .parentElement?.textContent,
      ).toContain('nie istnieje już');
      fireEvent.click(screen.getByRole('button', { name: choice }));
      expect(storedData().grossAmount).toBe(grossAmount);
      expect(
        JSON.parse(screen.getByTestId('preview').textContent!).invoiceNumber,
      ).toBeUndefined();
    },
  );

  it('closes the bank confirmation without saving', async () => {
    render(
      <GeneratorClient
        {...baseProps}
        signedIn
        bankAccount={{ ...bankAccount, bankName: 'Another bank' }}
        duplicateData={formData()}
      />,
    );
    await ready();
    const save = screen.getByRole('button', { name: 'Zapisz rachunek' });
    fireEvent.click(save);
    await screen.findByRole('dialog');
    await closeDialogWith('Close');
    fireEvent.click(save);
    await screen.findByRole('dialog');
    await closeDialogWith('Anuluj');
    expect(mocks.save).not.toHaveBeenCalled();
    edit({
      paymentMethod: 'TRANSFER',
      transferTarget: 'SAVED_ACCOUNT',
      bankAccountNumber: undefined,
    });
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Zapisz rachunek' })
        .disabled,
    ).toBe(true);
  });
});

describe('annual income validation and recovery', () => {
  it('explains invalid PESEL and settlement period without requesting income', async () => {
    render(
      <GeneratorClient {...baseProps} signedIn duplicateData={formData()} />,
    );
    await ready();
    mocks.income.mockClear();
    edit({ contractorPesel: '123' });
    expect(screen.getByTestId('income').textContent).toContain(
      'Podaj prawidłowy PESEL zleceniobiorcy.',
    );
    edit({ periodStart: 'invalid' });
    expect(screen.getByTestId('income').textContent).toContain(
      'Podaj prawidłowy początek okresu rozliczeniowego.',
    );
    expect(screen.getByText(/Brak parametrów podatkowych/)).toBeDefined();
    expect(mocks.income).not.toHaveBeenCalled();
  });

  it('retries a failed income check', async () => {
    mocks.income
      .mockResolvedValueOnce({ ok: false, error: 'Denied' })
      .mockResolvedValueOnce({ ok: true, data: 700 });
    render(
      <GeneratorClient {...baseProps} signedIn duplicateData={formData()} />,
    );
    await ready();
    expect(screen.getByText(/Podgląd nie uwzględnia jeszcze/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
    await waitFor(() =>
      expect(screen.getByTestId('income').textContent).toContain(
        '"income":700',
      ),
    );
    expect(mocks.income).toHaveBeenCalledTimes(2);
    expect(mocks.snapshot).not.toHaveBeenCalled();
  });

  it('shows a server conflict instead of retrying income for a deleted invoice', async () => {
    mocks.income.mockResolvedValueOnce({ ok: false, error: 'Denied' });
    render(
      <GeneratorClient
        {...baseProps}
        signedIn
        bankAccount={bankAccount}
        draftContext='invoice:existing'
        initialInvoice={existingInvoice}
      />,
    );
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
    const heading = await screen.findByRole('heading', {
      name: 'Wybierz wersję formularza',
    });
    expect(mocks.snapshot).toHaveBeenCalledWith('existing', false);
    expect(mocks.income).toHaveBeenCalledOnce();
    await waitFor(() => expect(document.activeElement).toBe(heading));
    fireEvent.click(
      screen.getByRole('button', { name: 'Odtwórz jako nowy rachunek' }),
    );
    expect(
      screen.getByRole('button', { name: 'Zapisz rachunek' }),
    ).toBeDefined();
  });

  it('applies current income and opens a conflict after rejected updates', async () => {
    mocks.save
      .mockResolvedValueOnce({
        ok: false,
        error: 'Income changed',
        currentSavedInvoiceTaxableIncome: 900,
      })
      .mockResolvedValueOnce({
        ok: false,
        error: 'Changed elsewhere',
        invoiceChanged: true,
      });
    mocks.snapshot.mockResolvedValue({
      ok: true,
      data: { ...existingInvoice, updatedAt: '2026-10-22T00:00:00.000Z' },
    });
    render(
      <GeneratorClient
        {...baseProps}
        signedIn
        bankAccount={bankAccount}
        draftContext='invoice:existing'
        initialInvoice={existingInvoice}
      />,
    );
    await ready();
    fireEvent.click(
      screen.getByRole('button', { name: 'Zaktualizuj rachunek' }),
    );
    await screen.findByText('Income changed');
    expect(screen.getByTestId('income').textContent).toContain('"income":900');
    fireEvent.click(
      screen.getByRole('button', { name: 'Zaktualizuj rachunek' }),
    );
    const heading = await screen.findByRole('heading', {
      name: 'Wybierz wersję formularza',
    });
    expect(heading.parentElement?.textContent).toContain(
      'Istnieje zapisany rachunek',
    );
    expect(mocks.snapshot).toHaveBeenCalledWith('existing', false);
  });
});
