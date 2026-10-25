// @vitest-environment node
import type { ImportSummary } from '@/app/account/importActions';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './dom';
import { testing } from './dom';

const { act, cleanup, fireEvent, render, screen, waitFor } = testing;
const [
  { ImportDataCard },
  { SessionActionButton },
  { default: DeleteSavedDataButton },
  { default: PartyEditor },
] = await Promise.all([
  import('@/app/account/ImportDataCard'),
  import('@/app/account/SessionActions'),
  import('@/app/account/invoices/DeleteSavedDataButton'),
  import('@/app/account/invoices/PartyEditor'),
]);
const mocks = vi.hoisted(() => ({
  revoke: vi.fn(),
  others: vi.fn(),
  all: vi.fn(),
  deleteInvoice: vi.fn(),
  deleteParty: vi.fn(),
  deleteInvoices: vi.fn(),
  deleteParties: vi.fn(),
  saveParty: vi.fn(),
  updateParty: vi.fn(),
  import: vi.fn(),
  refresh: vi.fn(),
  capture: vi.fn(),
  tag: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock('@/app/account/actions', () => ({
  revokeSessionById: mocks.revoke,
  revokeOtherSessions: mocks.others,
  revokeAllSessions: mocks.all,
}));
vi.mock('@/app/actions/savedData', () => ({
  deleteInvoice: mocks.deleteInvoice,
  deleteParty: mocks.deleteParty,
  deleteAllInvoices: mocks.deleteInvoices,
  deleteAllParties: mocks.deleteParties,
  saveParty: mocks.saveParty,
  updateParty: mocks.updateParty,
}));
vi.mock('@/app/account/importActions', () => ({
  importUserData: mocks.import,
}));
vi.mock('@sentry/nextjs', () => ({
  captureException: mocks.capture,
  withScope: (callback: (scope: { setTag: typeof mocks.tag }) => void) =>
    callback({ setTag: mocks.tag }),
}));

const summary: ImportSummary = {
  committed: false,
  invoices: { add: 1, duplicates: 2, invalid: 3 },
  parties: { add: 1, duplicates: 0, invalid: 0 },
  bankAccount: 'add',
  problems: ['Invalid record'],
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  for (const fn of [mocks.revoke, mocks.others, mocks.all])
    fn.mockResolvedValue({ ok: true, message: 'Revoked' });
  for (const fn of [
    mocks.deleteInvoice,
    mocks.deleteParty,
    mocks.deleteInvoices,
    mocks.deleteParties,
  ])
    fn.mockResolvedValue({ ok: true, data: 2 });
  mocks.saveParty.mockResolvedValue({ ok: true, data: { id: 'new' } });
  mocks.updateParty.mockResolvedValue({ ok: true });
  mocks.import.mockResolvedValue({ ok: true, data: summary });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('session and saved data controls', () => {
  it.each(['one', 'others', 'all'] as const)(
    'calls the right session action for %s',
    async (kind) => {
      render(
        <SessionActionButton
          kind={kind}
          sessionId='session-1'
          label='Revoke'
          variant='outline-danger'
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));
      expect(await screen.findByRole('status')).toHaveProperty(
        'textContent',
        'Revoked',
      );
      expect(
        kind === 'one'
          ? mocks.revoke
          : kind === 'others'
            ? mocks.others
            : mocks.all,
      ).toHaveBeenCalledOnce();
      if (kind === 'one')
        expect(mocks.revoke).toHaveBeenCalledWith('session-1');
    },
  );

  it('passes an empty id for a missing single-session identifier', async () => {
    render(
      <SessionActionButton
        kind='one'
        label='Revoke'
        variant='outline-danger'
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    await screen.findByRole('status');
    expect(mocks.revoke).toHaveBeenCalledWith('');
  });

  it.each(['invoice', 'party', 'allInvoices', 'allParties'] as const)(
    'deletes the requested target %s and refreshes',
    async (target) => {
      render(
        <DeleteSavedDataButton
          target={target}
          id='record-1'
          label='Delete'
          confirmMessage='Confirm?'
        />,
      );
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
      const action =
        target === 'invoice'
          ? mocks.deleteInvoice
          : target === 'party'
            ? mocks.deleteParty
            : target === 'allInvoices'
              ? mocks.deleteInvoices
              : mocks.deleteParties;
      expect(action).toHaveBeenCalledOnce();
      if (target === 'invoice' || target === 'party')
        expect(action).toHaveBeenCalledWith('record-1');
      else
        expect((await screen.findByRole('status')).textContent).toContain(
          '(2)',
        );
    },
  );

  it.each(['invoice', 'party'] as const)(
    'passes empty identifiers when %s id is missing',
    async (target) => {
      render(
        <DeleteSavedDataButton
          target={target}
          label='Delete'
          confirmMessage='Confirm?'
        />,
      );
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
      expect(
        target === 'invoice' ? mocks.deleteInvoice : mocks.deleteParty,
      ).toHaveBeenCalledWith('');
    },
  );

  it('hides unavailable bulk delete buttons', () => {
    render(
      <DeleteSavedDataButton
        target='allInvoices'
        label='Delete'
        confirmMessage='Confirm?'
        showButton={false}
      />,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it.each([
    [
      'session',
      <SessionActionButton
        key='session'
        kind='one'
        label='Run'
        variant='outline-danger'
      />,
      mocks.revoke,
    ],
    [
      'delete',
      <DeleteSavedDataButton
        key='delete'
        target='invoice'
        label='Run'
        confirmMessage='Confirm?'
      />,
      mocks.deleteInvoice,
    ],
  ] as const)(
    'supports cancellation, errors, pending and reporting for %s',
    async (kind, element, action) => {
      render(element);
      vi.mocked(window.confirm).mockReturnValue(false);
      fireEvent.click(screen.getByRole('button', { name: 'Run' }));
      expect(action).not.toHaveBeenCalled();
      vi.mocked(window.confirm).mockReturnValue(true);
      action.mockResolvedValueOnce({
        ok: false,
        message: 'Failed',
        error: 'Failed',
      });
      fireEvent.click(screen.getByRole('button', { name: 'Run' }));
      expect((await screen.findByRole('alert')).textContent).toBe('Failed');
      await waitFor(() =>
        expect(
          screen.getByRole<HTMLButtonElement>('button', { name: 'Run' })
            .disabled,
        ).toBe(false),
      );
      expect(mocks.refresh).not.toHaveBeenCalled();
      let reject!: (error: Error) => void;
      action.mockReturnValue(
        new Promise((_resolve, fail) => {
          reject = fail;
        }),
      );
      fireEvent.click(screen.getByRole('button', { name: 'Run' }));
      await waitFor(() =>
        expect(
          screen.getByRole<HTMLButtonElement>('button', {
            name: kind === 'session' ? 'Wylogowywanie…' : 'Usuwanie…',
          }).disabled,
        ).toBe(true),
      );
      const error = new Error('network');
      await act(async () => {
        reject(error);
      });
      expect(screen.getByRole('alert').textContent).toContain(
        'Spróbuj ponownie',
      );
      expect(mocks.capture).toHaveBeenCalledWith(error);
      expect(mocks.tag).toHaveBeenCalledWith(
        'error.area',
        kind === 'session'
          ? 'account.sessions.revoke'
          : 'account.saved-data.delete',
      );
    },
  );
});

describe('party editor', () => {
  it('creates a contractor then closes the modal after success', async () => {
    render(<PartyEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj' }));
    const dialog = await screen.findByRole('dialog');
    const form = dialog.querySelector('form');
    if (!form) throw new Error('Missing editor form');
    const name = form.querySelector<HTMLInputElement>('input[name="name"]');
    const address = form.querySelector<HTMLInputElement>(
      'input[name="address"]',
    );
    if (!name || !address) throw new Error('Missing party inputs');
    fireEvent.change(name, { target: { value: 'Jan' } });
    fireEvent.change(address, { target: { value: 'Warszawa' } });
    fireEvent.submit(form);
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
    expect(mocks.saveParty).toHaveBeenCalledWith({
      kind: 'CONTRACTOR',
      clientType: undefined,
      name: 'Jan',
      address: 'Warszawa',
      nip: '',
      pesel: '',
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('updates existing client data and keeps validation errors in the modal', async () => {
    const party = {
      id: 'p1',
      kind: 'CLIENT' as const,
      clientType: 'company' as const,
      name: 'Firma',
      address: 'Adres',
      nip: '123',
      pesel: null,
      label: 'Firma',
    };
    mocks.updateParty
      .mockResolvedValueOnce({ ok: false, error: 'Invalid party' })
      .mockResolvedValueOnce({ ok: true });
    render(<PartyEditor party={party} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edytuj' }));
    const dialog = await screen.findByRole('dialog');
    const form = dialog.querySelector('form');
    if (!form) throw new Error('Missing editor form');
    fireEvent.submit(form);
    expect(await screen.findByText('Invalid party')).toBeDefined();
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.updateParty).toHaveBeenCalledWith('p1', {
      kind: 'CLIENT',
      clientType: 'company',
      name: 'Firma',
      address: 'Adres',
      nip: '123',
      pesel: '',
    });
    fireEvent.change(screen.getAllByRole('combobox')[0], {
      target: { value: 'CONTRACTOR' },
    });
    expect(screen.queryByText('Typ zleceniodawcy')).toBeNull();
    fireEvent.submit(form);
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
  });

  it('supports client role selection, cancel and the modal close button', async () => {
    render(<PartyEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj' }));
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'CLIENT' },
    });
    expect(screen.getByText('Typ zleceniodawcy')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj' }));
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(mocks.saveParty).not.toHaveBeenCalled();
  });
});

describe('import preview and confirmation', () => {
  async function confirmImport() {
    await waitFor(() =>
      expect(
        screen.getByRole<HTMLButtonElement>('button', { name: 'Zaimportuj' })
          .disabled,
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Zaimportuj' }));
  }

  function chooseFile(text = '{"version":1}') {
    const file = new File([text], 'export.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: async () => text });
    fireEvent.change(screen.getByLabelText(/Plik eksportu danych/), {
      target: { files: [file] },
    });
    return file;
  }
  it('does not call the server without a selected file or for oversized files', () => {
    render(<ImportDataCard />);
    const input = screen.getByLabelText(/Plik eksportu danych/);
    fireEvent.change(input, { target: { files: [] } });
    fireEvent.change(input, { target: { files: [{ size: 5_000_001 }] } });
    expect(screen.getByRole('alert').textContent).toContain('zbyt duży');
    expect(mocks.import).not.toHaveBeenCalled();
  });
  it('shows preview counts and problems, commits only after confirmation then refreshes', async () => {
    mocks.import
      .mockResolvedValueOnce({ ok: true, data: summary })
      .mockResolvedValueOnce({
        ok: true,
        data: { ...summary, committed: true },
      });
    render(<ImportDataCard />);
    chooseFile();
    expect(await screen.findByText('Podgląd importu')).toBeDefined();
    expect(screen.getByText('Invalid record')).toBeDefined();
    expect(mocks.import).toHaveBeenCalledWith('{"version":1}', false);
    await confirmImport();
    expect((await screen.findByRole('status')).textContent).toContain(
      'rachunek bankowy',
    );
    expect(mocks.import).toHaveBeenLastCalledWith('{"version":1}', true);
    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(screen.queryByText('Podgląd importu')).toBeNull();
  });
  it.each(['exists', 'none', 'invalid'] as const)(
    'disables empty import with bank status %s and supports cancel',
    async (bankAccount) => {
      mocks.import.mockResolvedValue({
        ok: true,
        data: {
          ...summary,
          invoices: { add: 0, duplicates: 0, invalid: 0 },
          parties: { add: 0, duplicates: 0, invalid: 0 },
          bankAccount,
          problems: [],
        },
      });
      render(<ImportDataCard />);
      chooseFile();
      expect(await screen.findByText('Podgląd importu')).toBeDefined();
      await waitFor(() =>
        expect(
          screen.getByRole<HTMLButtonElement>('button', { name: 'Anuluj' })
            .disabled,
        ).toBe(false),
      );
      expect(
        screen.getByRole<HTMLButtonElement>('button', { name: 'Zaimportuj' })
          .disabled,
      ).toBe(true);
      fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
      expect(screen.queryByText('Podgląd importu')).toBeNull();
      expect(mocks.import).toHaveBeenCalledTimes(1);
    },
  );
  it('reports server preview errors', async () => {
    mocks.import.mockResolvedValue({ ok: false, error: 'Invalid file' });
    render(<ImportDataCard />);
    chooseFile();
    expect((await screen.findByRole('alert')).textContent).toBe('Invalid file');
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it.each(['preview', 'commit'] as const)(
    'captures thrown %s errors without refreshing',
    async (stage) => {
      const error = new Error('network');
      if (stage === 'preview') mocks.import.mockRejectedValue(error);
      else
        mocks.import
          .mockResolvedValueOnce({ ok: true, data: summary })
          .mockRejectedValueOnce(error);
      render(<ImportDataCard />);
      chooseFile();
      if (stage === 'commit') await confirmImport();
      await waitFor(() => expect(mocks.capture).toHaveBeenCalledWith(error));
      expect(mocks.tag).toHaveBeenCalledWith(
        'error.area',
        `account.import.${stage}`,
      );
      expect(mocks.refresh).not.toHaveBeenCalled();
      expect(
        screen.getByText(/Spróbuj ponownie|spróbuj jeszcze raz/),
      ).toBeDefined();
    },
  );
  it('reports server commit errors while retaining the preview for retry', async () => {
    mocks.import
      .mockResolvedValueOnce({ ok: true, data: summary })
      .mockResolvedValueOnce({ ok: false, error: 'Conflict' });
    render(<ImportDataCard />);
    chooseFile();
    await confirmImport();
    expect(await screen.findByText('Conflict')).toBeDefined();
    expect(screen.getByText('Podgląd importu')).toBeDefined();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
