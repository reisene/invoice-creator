// @vitest-environment node
import { DEFAULT_TAX_PARAMS } from '@/lib/invoice/taxConstants';
import type { InvoiceFormData } from '@/types/invoiceForm';
import { useState, type ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { testing } from '../app/dom';
import { bankAccount, formData } from './fixtures';

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  tag: vi.fn(),
  capture: vi.fn(),
}));
vi.mock('@/app/actions/savedData', () => ({
  saveUserBankAccountAction: mocks.save,
}));
vi.mock('@sentry/nextjs', () => ({
  captureException: mocks.capture,
  withScope: (fn: (scope: { setTag: typeof mocks.tag }) => void) =>
    fn({ setTag: mocks.tag }),
}));
const { default: InvoiceForm } =
  await import('@/components/generator/InvoiceForm');
const { act, cleanup, fireEvent, render, screen, waitFor } = testing;
beforeEach(() => {
  vi.resetAllMocks();
});
afterEach(() => {
  cleanup();
});
function field(label: string, index = 0) {
  // Existing labels are not associated with controls; locate their form group.
  const labels = Array.from(document.querySelectorAll('label')).filter((node) =>
    node.textContent?.trim().startsWith(label),
  );
  let group = labels[index]?.parentElement;
  while (group && !group.querySelector('input,select,textarea'))
    group = group.parentElement;
  const control = group?.querySelector<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >('input,select,textarea');
  if (!control) throw new Error(`Missing field ${label} (${index})`);
  return control;
}
function mount(
  overrides: Partial<InvoiceFormData> = {},
  props: Partial<ComponentProps<typeof InvoiceForm>> = {},
) {
  const changed = vi.fn();
  function Harness() {
    const [data, setData] = useState(formData(overrides));
    return (
      <InvoiceForm
        data={data}
        onChange={(next) => {
          changed(next);
          setData(next);
        }}
        bankAccount={null}
        taxParams={DEFAULT_TAX_PARAMS}
        {...props}
      />
    );
  }
  const result = render(<Harness />);
  return { ...result, changed };
}

describe('invoice form data binding', () => {
  it.each([
    ['Miejscowość wystawienia', 'issuePlace', 'Gdańsk'],
    ['Data wystawienia', 'issueDate', '2026-04-30'],
    ['Nazwa / Imię i nazwisko', 'clientName', 'Client'],
    ['Adres', 'clientAddress', 'Client address'],
    ['NIP', 'clientNip', '1234567890'],
    ['Imię i nazwisko', 'contractorName', 'Contractor'],
    ['PESEL', 'contractorPesel', '44051401458'],
    ['NIP (opcjonalnie)', 'contractorNip', '5250001003'],
    ['Numer umowy', 'contractNumber', 'Contract/1'],
    ['Data zawarcia umowy', 'contractDate', '2026-03-02'],
    ['Okres rozliczeniowy – od', 'periodStart', '2026-03-02'],
    ['Okres rozliczeniowy – do', 'periodEnd', '2026-03-30'],
    ['Kwota brutto', 'grossAmount', '6500.25'],
    ['Koszty uzyskania przychodu', 'costType', '50'],
    ['Wysokość kwoty zmniejszającej', 'taxReductionAmount', '150'],
    [
      'Dochód do opodatkowania z innych źródeł',
      'yearToDateTaxableIncome',
      '120000',
    ],
    ['Nazwa banku / instytucji', 'bankName', 'Other bank'],
    ['Uwagi do rachunku', 'notes', 'Test note'],
  ] as const)(
    'updates %s without losing unrelated values',
    (label, key, value) => {
      const { changed } = mount();
      fireEvent.change(field(label), { target: { value } });
      const numeric = [
        'grossAmount',
        'taxReductionAmount',
        'yearToDateTaxableIncome',
      ].includes(key);
      expect(changed).toHaveBeenLastCalledWith({
        ...formData(),
        [key]: numeric ? Number(value) : value,
      });
    },
  );
  it('updates the separate contractor address and account holder', () => {
    const { changed } = mount();
    fireEvent.change(field('Adres', 1), {
      target: { value: 'Contractor address' },
    });
    expect(changed.mock.lastCall?.[0].contractorAddress).toBe(
      'Contractor address',
    );
    fireEvent.change(
      screen.getByPlaceholderText('Imię i nazwisko posiadacza rachunku'),
      { target: { value: 'Account owner' } },
    );
    expect(changed.mock.lastCall?.[0].bankAccountHolder).toBe('Account owner');
  });
  it.each([
    ['NIP', 'clientNip'],
    ['NIP (opcjonalnie)', 'contractorNip'],
    ['Numer umowy', 'contractNumber'],
    ['Kwota brutto', 'grossAmount'],
    ['Uwagi do rachunku', 'notes'],
  ] as const)('clears optional %s to undefined', (label, key) => {
    const { changed } = mount({
      contractorNip: '5250001003',
      contractNumber: '1',
      notes: 'note',
    });
    fireEvent.change(field(label), { target: { value: '' } });
    expect(changed.mock.lastCall?.[0][key]).toBeUndefined();
  });
  it('switches client type and updates/clears private PESEL', () => {
    const { changed } = mount();
    fireEvent.change(field('Typ zleceniodawcy'), {
      target: { value: 'private' },
    });
    expect(changed.mock.lastCall?.[0].clientType).toBe('private');
    fireEvent.change(field('PESEL'), { target: { value: '90010112349' } });
    expect(changed.mock.lastCall?.[0].clientPesel).toBe('90010112349');
    fireEvent.change(field('PESEL'), { target: { value: '' } });
    expect(changed.mock.lastCall?.[0].clientPesel).toBeUndefined();
  });
  it('switches to hourly and updates then clears rate and hours', () => {
    const { changed } = mount();
    fireEvent.change(field('Typ umowy'), { target: { value: 'hourly' } });
    for (const [label, key] of [
      ['Stawka za godzinę', 'hourlyRate'],
      ['Liczba godzin', 'hoursWorked'],
    ]) {
      fireEvent.change(field(label), { target: { value: '35.5' } });
      expect(changed.mock.lastCall?.[0][key]).toBe(35.5);
      fireEvent.change(field(label), { target: { value: '' } });
      expect(changed.mock.lastCall?.[0][key]).toBeUndefined();
    }
  });
  it('coordinates all contractor statuses and income options', () => {
    const { changed } = mount();
    fireEvent.click(screen.getByLabelText('Dobrowolna składka chorobowa'));
    expect(changed.mock.lastCall?.[0].voluntarySickness).toBe(false);
    fireEvent.change(field('Status zleceniobiorcy'), {
      target: { value: 'student_under_26' },
    });
    expect(changed.mock.lastCall?.[0]).toMatchObject({
      voluntarySickness: false,
      youngRelief: true,
    });
    expect(
      screen.getByLabelText<HTMLInputElement>('Dobrowolna składka chorobowa')
        .disabled,
    ).toBe(true);
    fireEvent.change(field('Przychód objęty ulgą'), {
      target: { value: '1000.5' },
    });
    expect(changed.mock.lastCall?.[0].yearToDateYoungReliefIncome).toBe(1000.5);
    fireEvent.change(field('Przychód objęty ulgą'), { target: { value: '' } });
    expect(changed.mock.lastCall?.[0].yearToDateYoungReliefIncome).toBe(0);
    fireEvent.change(field('Status zleceniobiorcy'), {
      target: { value: 'with_employment' },
    });
    expect(changed.mock.lastCall?.[0]).toMatchObject({
      voluntarySickness: false,
      contractorStatus: 'with_employment',
    });
    fireEvent.change(field('Dochód do opodatkowania z umowy o pracę'), {
      target: { value: '90000' },
    });
    expect(changed.mock.lastCall?.[0].yearToDateEmploymentIncome).toBe(90000);
    fireEvent.change(field('Dochód do opodatkowania z umowy o pracę'), {
      target: { value: '' },
    });
    expect(changed.mock.lastCall?.[0].yearToDateEmploymentIncome).toBe(0);
    fireEvent.change(field('Status zleceniobiorcy'), {
      target: { value: 'standard' },
    });
    fireEvent.click(
      screen.getByLabelText('Ulga dla młodych (0% PIT do limitu)'),
    );
    expect(changed.mock.lastCall?.[0].youngRelief).toBe(false);
    fireEvent.change(field('Dochód do opodatkowania z innych źródeł'), {
      target: { value: '10' },
    });
    fireEvent.change(field('Dochód do opodatkowania z innych źródeł'), {
      target: { value: '' },
    });
    expect(changed.mock.lastCall?.[0].yearToDateTaxableIncome).toBe(0);
  });
  it('makes PIT-2 and the no-advance request mutually exclusive in both directions', () => {
    const { changed } = mount();
    const pit = screen.getByLabelText(/Kwota zmniejszająca podatek/);
    const noAdvance = screen.getByLabelText(/Wniosek o niepobieranie/);
    fireEvent.click(noAdvance);
    expect(changed.mock.lastCall?.[0]).toMatchObject({
      noTaxAdvanceRequest: true,
      taxReduction: false,
    });
    fireEvent.click(noAdvance);
    expect(changed.mock.lastCall?.[0]).toMatchObject({
      noTaxAdvanceRequest: false,
      taxReduction: false,
    });
    fireEvent.click(pit);
    expect(changed.mock.lastCall?.[0]).toMatchObject({
      noTaxAdvanceRequest: false,
      taxReduction: true,
    });
    fireEvent.click(pit);
    expect(changed.mock.lastCall?.[0].taxReduction).toBe(false);
    fireEvent.click(noAdvance);
    fireEvent.click(pit);
    expect(changed.mock.lastCall?.[0]).toMatchObject({
      noTaxAdvanceRequest: false,
      taxReduction: true,
    });
  });
  it('renders missing legacy values and annual saved-income states', () => {
    const data = formData({
      issueDate: undefined,
      issuePlace: undefined,
      paymentMethod: '',
      noTaxAdvanceRequest: undefined,
    });
    const props = {
      data,
      onChange: vi.fn(),
      bankAccount: null,
      signedIn: true,
    };
    const { rerender } = render(
      <InvoiceForm {...props} isLoadingSavedIncome />,
    );
    expect(screen.getByText('Sumowanie zapisanych rachunków…')).toBeDefined();
    expect(
      screen.getByText(/Ten rachunek nie ma wybranej formy wypłaty/),
    ).toBeDefined();
    expect(
      screen.getByRole('option', { name: '20% (standard)' }),
    ).toBeDefined();
    rerender(
      <InvoiceForm
        {...props}
        savedInvoiceTaxableIncome={1234}
        savedIncomeError='Income failed'
      />,
    );
    expect(
      screen.getByText(/Podstawa z zapisanych rachunków/).textContent,
    ).toContain('1');
    expect(screen.getByRole('alert').textContent).toBe('Income failed');
  });
});

describe('payment and bank account controls', () => {
  it('clears account data when the first payment selector switches to cash and restores selected profile data', () => {
    const { changed } = mount({}, { bankAccount });
    fireEvent.change(field('Sposób wypłaty wynagrodzenia'), {
      target: { value: 'CASH' },
    });
    expect(changed.mock.lastCall?.[0]).toMatchObject({
      paymentMethod: 'CASH',
      transferTarget: '',
      bankAccountNumber: undefined,
      bankName: undefined,
      bankAccountHolder: undefined,
    });
    fireEvent.change(field('Sposób wypłaty wynagrodzenia'), {
      target: { value: 'TRANSFER' },
    });
    fireEvent.change(field('Rachunek do przelewu'), {
      target: { value: 'SAVED_ACCOUNT' },
    });
    expect(changed.mock.lastCall?.[0]).toMatchObject({
      bankAccountNumber: bankAccount.accountNumber,
      bankName: bankAccount.bankName,
      bankAccountHolder: bankAccount.accountHolder,
    });
    fireEvent.change(field('Rachunek do przelewu'), {
      target: { value: 'DECLARATION' },
    });
    expect(changed.mock.lastCall?.[0]).toMatchObject({
      transferTarget: 'DECLARATION',
      bankAccountNumber: undefined,
      bankName: undefined,
      bankAccountHolder: undefined,
    });
  });
  it.each([null, bankAccount])(
    'coordinates the second payment selector with saved profile %j',
    (account) => {
      const { changed } = mount(
        {
          bankAccountNumber: undefined,
          bankName: undefined,
          bankAccountHolder: undefined,
        },
        { bankAccount: account },
      );
      fireEvent.change(field('Sposób wypłaty', 1), {
        target: { value: 'CASH' },
      });
      expect(changed.mock.lastCall?.[0].paymentMethod).toBe('CASH');
      fireEvent.change(field('Sposób wypłaty', 1), {
        target: { value: 'TRANSFER_DECLARATION' },
      });
      expect(changed.mock.lastCall?.[0].transferTarget).toBe('DECLARATION');
      fireEvent.change(field('Sposób wypłaty', 1), {
        target: { value: 'TRANSFER_ACCOUNT' },
      });
      expect(changed.mock.lastCall?.[0]).toMatchObject({
        paymentMethod: 'TRANSFER',
        transferTarget: 'SAVED_ACCOUNT',
        bankAccountHolder: account?.accountHolder ?? 'Jan Kowalski',
      });
      expect(changed.mock.lastCall?.[0].bankAccountNumber).toBe(
        account ? '61 1090 1014 0000 0712 1981 2874' : '',
      );
    },
  );
  it('preserves explicitly entered payment fields and handles an empty contractor', () => {
    const { changed, unmount } = mount();
    fireEvent.change(field('Sposób wypłaty', 1), { target: { value: 'CASH' } });
    fireEvent.change(field('Sposób wypłaty', 1), {
      target: { value: 'TRANSFER_ACCOUNT' },
    });
    expect(changed.mock.lastCall?.[0].bankName).toBe(formData().bankName);
    unmount();
    const next = mount({
      contractorName: '',
      bankAccountNumber: undefined,
      bankAccountHolder: undefined,
      bankName: undefined,
    });
    fireEvent.change(field('Sposób wypłaty', 1), {
      target: { value: 'TRANSFER_DECLARATION' },
    });
    fireEvent.change(field('Sposób wypłaty', 1), {
      target: { value: 'TRANSFER_ACCOUNT' },
    });
    expect(next.changed.mock.lastCall?.[0].bankAccountHolder).toBe('');
  });
  it('formats the account, detects bank and owner only when empty and displays validity', () => {
    const { changed } = mount({
      bankAccountNumber: '',
      bankName: '',
      bankAccountHolder: undefined,
    });
    const account = screen.getByPlaceholderText(
      'np. 12 3456 7890 1234 5678 9012 3456',
    );
    fireEvent.change(account, { target: { value: '61' } });
    expect(screen.getByText('Wpisano 2 z 26 cyfr.')).toBeDefined();
    fireEvent.change(account, { target: { value: bankAccount.accountNumber } });
    expect(changed.mock.lastCall?.[0]).toMatchObject({
      bankName: 'Santander Bank Polska',
      bankAccountHolder: 'Jan Kowalski',
      bankAccountNumber: '61 1090 1014 0000 0712 1981 2874',
    });
    expect(screen.getByText('Prawidłowy numer konta')).toBeDefined();
    fireEvent.change(account, {
      target: { value: '00109010140000071219812874' },
    });
    expect(screen.getByText(/Nieprawidłowa suma kontrolna/)).toBeDefined();
    fireEvent.change(account, {
      target: { value: '61102010140000071219812874' },
    });
    expect(changed.mock.lastCall?.[0].bankName).toBe('Santander Bank Polska');
  });
  it('uses the contractor or the saved profile on request', () => {
    const { changed } = mount(
      { bankAccountHolder: 'Other person' },
      { signedIn: true, bankAccount },
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Użyj zleceniobiorcy' }),
    );
    expect(changed.mock.lastCall?.[0].bankAccountHolder).toBe('Jan Kowalski');
    fireEvent.click(screen.getByRole('button', { name: 'Użyj tego konta' }));
    expect(changed.mock.lastCall?.[0]).toMatchObject({
      bankAccountHolder: bankAccount.accountHolder,
      bankName: bankAccount.bankName,
    });
  });
  it('shows bank and owner validation without making a server call', async () => {
    // Valid checksum with an unknown bank code.
    const number = '47999900000000000000000000';
    const { unmount } = mount(
      {
        bankAccountNumber: number,
        bankName: '',
        contractorName: '',
        bankAccountHolder: '',
      },
      { signedIn: true },
    );
    const save = screen.getByRole<HTMLButtonElement>('button', {
      name: 'Zapisz ten rachunek w profilu',
    });
    expect(save.disabled).toBe(false);
    fireEvent.click(save);
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Wpisz nazwę banku',
    );
    expect(mocks.save).not.toHaveBeenCalled();
    unmount();
    mount({ bankAccountHolder: '', contractorName: '' }, { signedIn: true });
    fireEvent.click(
      screen.getByRole('button', { name: 'Zapisz ten rachunek w profilu' }),
    );
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Wpisz nazwę właściciela',
    );
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('saves trimmed profile data, blocks duplicate clicks and supports dismissing feedback', async () => {
    let finish!: (value: { ok: true; data: typeof bankAccount }) => void;
    mocks.save.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const saved = vi.fn();
    mount(
      {
        bankAccountHolder: ' Jan Kowalski ',
        bankName: ' Santander Bank Polska ',
      },
      { signedIn: true, onBankAccountSaved: saved },
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Zapisz ten rachunek w profilu' }),
    );
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Zapisywanie…' })
        .disabled,
    ).toBe(true);
    expect(mocks.save).toHaveBeenCalledWith(bankAccount);
    await act(async () => {
      finish({ ok: true, data: bankAccount });
    });
    expect(saved).toHaveBeenCalledWith(bankAccount);
    expect(screen.getByRole('alert').textContent).toContain('został zapisany');
    fireEvent.click(screen.getByRole('button', { name: 'Close alert' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(
      screen.getByRole('button', { name: 'Użyj tego konta' }),
    ).toBeDefined();
  });
  it('infers missing owner/bank and handles returned and thrown action errors', async () => {
    const error = new Error('network');
    mocks.save
      .mockResolvedValueOnce({ ok: false, error: 'Save denied' })
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ ok: true, data: bankAccount });
    mount({ bankName: '', bankAccountHolder: undefined }, { signedIn: true });
    const save = () =>
      screen.getByRole('button', { name: 'Zapisz ten rachunek w profilu' });
    fireEvent.click(save());
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Save denied',
    );
    expect(mocks.save).toHaveBeenCalledWith(bankAccount);
    fireEvent.click(save());
    await waitFor(() => expect(mocks.capture).toHaveBeenCalledWith(error));
    expect(screen.getByRole('alert').textContent).toContain('Wystąpił błąd');
    expect(mocks.tag).toHaveBeenCalledWith(
      'error.area',
      'generator.bank-account.save',
    );
    await waitFor(() =>
      expect((save() as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(save());
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain(
        'został zapisany',
      ),
    );
  });
});
