// @vitest-environment node
import PreviewClient from '@/app/preview/PreviewClient';
import { DEFAULT_TAX_PARAMS } from '@/lib/invoice/taxConstants';
import { SAMPLE_INVOICE_PRESETS } from '@/lib/sampleInvoices';
import type { InvoiceFormData } from '@/types/invoiceForm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './dom';
import { testing } from './dom';

const { act, cleanup, fireEvent, render, screen, waitFor } = testing;
const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  preview: vi.fn(),
  pdf: vi.fn(),
  document: vi.fn(),
  blob: vi.fn(),
  createUrl: vi.fn(),
  revokeUrl: vi.fn(),
  capture: vi.fn(),
  tag: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/components/generator/InvoicePreview', () => ({
  default: mocks.preview,
}));
vi.mock('@react-pdf/renderer', () => ({ pdf: mocks.pdf }));
vi.mock('@/components/generator/InvoicePdfDocument', () => ({
  default: mocks.document,
}));
vi.mock('@sentry/nextjs', () => ({
  captureException: mocks.capture,
  withScope: (callback: (scope: { setTag: typeof mocks.tag }) => void) =>
    callback({ setTag: mocks.tag }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  mocks.preview.mockImplementation(() => (
    <output data-testid='invoice-preview' />
  ));
  mocks.pdf.mockReturnValue({ toBlob: mocks.blob });
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
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function storedForm(): InvoiceFormData {
  fireEvent.click(screen.getByRole('button', { name: 'Otwórz w generatorze' }));
  return JSON.parse(sessionStorage.getItem('generator_preset_data')!);
}

describe('sample invoice preview', () => {
  it('renders every preset and selects it using pointer and keyboard', () => {
    render(<PreviewClient taxParams={[DEFAULT_TAX_PARAMS]} />);
    for (const preset of SAMPLE_INVOICE_PRESETS) {
      fireEvent.click(
        screen.getByRole('button', {
          name: (name) => name.includes(preset.name),
        }),
      );
      expect(storedForm()).toEqual(preset.formData);
      expect(screen.getByText(preset.legalNote)).toBeDefined();
    }
    const standard = screen.getByRole('button', {
      name: /Standardowe zlecenie/,
    });
    fireEvent.keyDown(standard, { key: 'Escape' });
    expect(storedForm()).toEqual(SAMPLE_INVOICE_PRESETS.at(-1)!.formData);
    fireEvent.keyDown(standard, { key: 'Enter' });
    expect(storedForm()).toEqual(SAMPLE_INVOICE_PRESETS[0].formData);
    fireEvent.keyDown(
      screen.getByRole('button', { name: /Student do 26 lat/ }),
      { key: ' ' },
    );
    expect(storedForm()).toEqual(SAMPLE_INVOICE_PRESETS[1].formData);
    expect(mocks.push).toHaveBeenCalledWith('/generator');
  });

  it('updates and clears monthly amounts and restores the selected preset', () => {
    render(<PreviewClient taxParams={[DEFAULT_TAX_PARAMS]} />);
    fireEvent.change(screen.getByRole('spinbutton'), {
      target: { value: '6500.50' },
    });
    expect(storedForm().grossAmount).toBe(6500.5);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '' } });
    expect(storedForm().grossAmount).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Domyślne kwoty' }));
    expect(storedForm()).toEqual(SAMPLE_INVOICE_PRESETS[0].formData);
  });

  it('updates and clears hourly rate and hours', () => {
    render(<PreviewClient taxParams={[DEFAULT_TAX_PARAMS]} />);
    const hourly = SAMPLE_INVOICE_PRESETS.find(
      (preset) => preset.formData.contractType === 'hourly',
    );
    if (!hourly) throw new Error('Missing hourly sample');
    fireEvent.click(
      screen.getByRole('button', {
        name: (name) => name.includes(hourly.name),
      }),
    );
    const [rate, hours] = screen.getAllByRole('spinbutton');
    fireEvent.change(rate, { target: { value: '50' } });
    fireEvent.change(hours, { target: { value: '12.5' } });
    expect(storedForm()).toMatchObject({ hourlyRate: 50, hoursWorked: 12.5 });
    fireEvent.change(rate, { target: { value: '' } });
    fireEvent.change(hours, { target: { value: '' } });
    expect(storedForm().hourlyRate).toBeUndefined();
    expect(storedForm().hoursWorked).toBeUndefined();
  });

  it('updates costs, tax reduction, advance exemption and insurance flags', () => {
    render(<PreviewClient taxParams={[DEFAULT_TAX_PARAMS]} />);
    const [costs, reduction] = screen.getAllByRole('combobox');
    fireEvent.change(costs, { target: { value: '50' } });
    fireEvent.change(reduction, { target: { value: '150' } });
    expect(storedForm()).toMatchObject({
      costType: '50',
      taxReduction: true,
      taxReductionAmount: 150,
    });
    fireEvent.click(
      screen.getByLabelText('Nie pobieraj zaliczek do 30 000 zł'),
    );
    expect(storedForm()).toMatchObject({
      noTaxAdvanceRequest: true,
      taxReduction: false,
    });
    fireEvent.click(
      screen.getByLabelText('Nie pobieraj zaliczek do 30 000 zł'),
    );
    expect(storedForm().noTaxAdvanceRequest).toBe(false);
    fireEvent.change(reduction, { target: { value: '0' } });
    expect(storedForm()).toMatchObject({
      taxReduction: false,
      taxReductionAmount: 0,
    });
    fireEvent.click(
      screen.getByLabelText('Dobrowolna składka chorobowa (2,45%)'),
    );
    fireEvent.click(
      screen.getByLabelText('Ulga dla młodych (zwolnienie do 26 lat)'),
    );
    expect(storedForm()).toMatchObject({
      voluntarySickness: false,
      youngRelief: true,
    });
  });

  it('selects the newest applicable tax year and falls back to the first supplied year', () => {
    const past = { ...DEFAULT_TAX_PARAMS, year: 2020 };
    const future = { ...DEFAULT_TAX_PARAMS, year: 2030 };
    const { rerender } = render(
      <PreviewClient taxParams={[past, DEFAULT_TAX_PARAMS, future]} />,
    );
    expect(mocks.preview).toHaveBeenLastCalledWith(
      expect.objectContaining({ taxParams: DEFAULT_TAX_PARAMS }),
      undefined,
    );
    rerender(<PreviewClient taxParams={[future]} />);
    expect(mocks.preview).toHaveBeenLastCalledWith(
      expect.objectContaining({ taxParams: future }),
      undefined,
    );
  });

  it('still navigates when browser storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage blocked');
    });
    render(<PreviewClient taxParams={[DEFAULT_TAX_PARAMS]} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Otwórz w generatorze' }),
    );
    expect(mocks.push).toHaveBeenCalledWith('/generator');
  });

  it('generates one PDF, prevents duplicate requests and revokes its download URL', async () => {
    let resolve!: (blob: Blob) => void;
    mocks.blob.mockReturnValue(
      new Promise<Blob>((done) => {
        resolve = done;
      }),
    );
    render(<PreviewClient taxParams={[DEFAULT_TAX_PARAMS]} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Pobierz wzorcowy PDF' }),
    );
    await waitFor(() => expect(mocks.pdf).toHaveBeenCalledOnce());
    const pending = screen.getByRole<HTMLButtonElement>('button', {
      name: 'Generowanie pliku PDF…',
    });
    expect(pending.disabled).toBe(true);
    fireEvent.click(pending);
    expect(mocks.pdf).toHaveBeenCalledOnce();
    expect(mocks.document).toHaveBeenCalledWith(
      expect.any(Object),
      'WZORZEC/STANDARD/2026',
    );
    await act(async () => {
      resolve(new Blob(['invoice']));
    });
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[download]')).toBeNull();
    await waitFor(
      () => expect(mocks.revokeUrl).toHaveBeenCalledWith('blob:test-invoice'),
      { timeout: 2500 },
    );
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: 'Pobierz wzorcowy PDF',
      }).disabled,
    ).toBe(false);
  });

  it('reports PDF failures and allows a successful retry', async () => {
    const error = new Error('PDF failed');
    mocks.blob.mockRejectedValueOnce(error);
    render(<PreviewClient taxParams={[DEFAULT_TAX_PARAMS]} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Pobierz wzorcowy PDF' }),
    );
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Nie udało się wygenerować pliku PDF.',
    );
    expect(mocks.capture).toHaveBeenCalledWith(error);
    expect(mocks.tag).toHaveBeenCalledWith(
      'error.area',
      'preview.pdf.generate',
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Pobierz wzorcowy PDF' }),
    );
    await waitFor(() => expect(mocks.createUrl).toHaveBeenCalledOnce());
    expect(screen.queryByRole('alert')).toBeNull();
    await waitFor(() => expect(mocks.revokeUrl).toHaveBeenCalledOnce(), {
      timeout: 2500,
    });
  });
});
