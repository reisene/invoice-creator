// @vitest-environment node
import type { SavedPartyDto } from '@/types/savedData';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { testing } from '../app/dom';
import { formData } from './fixtures';

const save = vi.hoisted(() => vi.fn());
vi.mock('@/app/actions/savedData', () => ({ saveParty: save }));
const { default: SavedPartiesPanel } =
  await import('@/components/generator/SavedPartiesPanel');
const { act, cleanup, fireEvent, render, screen } = testing;
beforeEach(() => {
  vi.resetAllMocks();
});
afterEach(cleanup);
const client: SavedPartyDto = {
  id: 'client',
  kind: 'CLIENT',
  label: 'Saved client',
  clientType: 'private',
  name: 'Client',
  address: 'Client address',
  nip: '5250001003',
  pesel: '90010112349',
};
const contractor: SavedPartyDto = {
  ...client,
  id: 'contractor',
  kind: 'CONTRACTOR',
  label: 'Saved contractor',
  clientType: null,
};

describe('saved parties panel', () => {
  it('disables empty selects and links help', () => {
    render(
      <SavedPartiesPanel
        parties={[]}
        data={formData()}
        onChange={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    expect(
      screen
        .getAllByRole<HTMLSelectElement>('combobox')
        .every((select) => select.disabled),
    ).toBe(true);
    expect(
      screen.getAllByRole('option', { name: 'Brak zapisanych' }),
    ).toHaveLength(2);
    expect(screen.getByRole('link').getAttribute('href')).toBe(
      '/help/aplikacja/zapisywanie-danych-i-historia-rachunkow',
    );
  });
  it.each([false, true])(
    'applies each party preserving unrelated data (missing identifiers: %s)',
    (empty) => {
      const parties = [client, contractor].map((party) =>
        empty ? { ...party, nip: null, pesel: null, clientType: null } : party,
      );
      const change = vi.fn();
      render(
        <SavedPartiesPanel
          parties={parties}
          data={formData()}
          onChange={change}
          onSaved={vi.fn()}
        />,
      );
      const [clients, contractors] = screen.getAllByRole('combobox');
      fireEvent.change(clients, { target: { value: '' } });
      expect(change).not.toHaveBeenCalled();
      fireEvent.change(clients, { target: { value: 'client' } });
      expect(change).toHaveBeenLastCalledWith({
        ...formData(),
        clientType: empty ? 'company' : 'private',
        clientName: 'Client',
        clientAddress: 'Client address',
        clientNip: empty ? undefined : client.nip,
        clientPesel: empty ? undefined : client.pesel,
      });
      fireEvent.change(contractors, { target: { value: 'contractor' } });
      expect(change).toHaveBeenLastCalledWith({
        ...formData(),
        contractorName: 'Client',
        contractorAddress: 'Client address',
        contractorNip: empty ? undefined : contractor.nip,
        contractorPesel: empty ? '' : contractor.pesel,
      });
    },
  );
  it.each(['CLIENT', 'CONTRACTOR'] as const)(
    'saves %s with action feedback and a normalized DTO',
    async (kind) => {
      const data = formData({
        contractorNip: '5250001003',
        clientPesel: '90010112349',
      });
      const saved = vi.fn();
      let finish!: (result: {
        ok: boolean;
        data?: { id: string };
        error?: string;
      }) => void;
      save
        .mockReturnValueOnce(
          new Promise((resolve) => {
            finish = resolve;
          }),
        )
        .mockResolvedValueOnce({ ok: true, data: { id: 'new-id' } });
      render(
        <SavedPartiesPanel
          parties={[]}
          data={data}
          onChange={vi.fn()}
          onSaved={saved}
        />,
      );
      const index = kind === 'CLIENT' ? 0 : 1;
      fireEvent.click(
        screen.getAllByRole('button', { name: 'Zapisz bieżące dane' })[index],
      );
      expect(
        screen
          .getAllByRole<HTMLButtonElement>('button')
          .every((button) => button.disabled),
      ).toBe(true);
      await act(async () => {
        finish({ ok: false, error: 'Cannot save' });
      });
      expect(screen.getByRole('alert').textContent).toBe('Cannot save');
      expect(saved).not.toHaveBeenCalled();
      fireEvent.click(screen.getAllByRole('button')[index]);
      expect(await screen.findByText('Zapisano dane.')).toBeDefined();
      const isClient = kind === 'CLIENT';
      expect(save).toHaveBeenLastCalledWith({
        kind,
        clientType: isClient ? data.clientType : undefined,
        name: isClient ? data.clientName : data.contractorName,
        address: isClient ? data.clientAddress : data.contractorAddress,
        nip: '5250001003',
        pesel: '90010112349',
      });
      expect(saved).toHaveBeenCalledWith({
        id: 'new-id',
        kind,
        clientType: isClient ? data.clientType : null,
        label: isClient ? data.clientName : data.contractorName,
        name: isClient ? data.clientName : data.contractorName,
        address: isClient ? data.clientAddress : data.contractorAddress,
        nip: '5250001003',
        pesel: '90010112349',
      });
    },
  );
  it.each([0, 1])(
    'normalizes absent identifiers for party %s',
    async (index) => {
      save.mockResolvedValue({ ok: true, data: { id: 'empty-identifiers' } });
      const saved = vi.fn();
      render(
        <SavedPartiesPanel
          parties={[]}
          data={formData({
            clientNip: undefined,
            clientPesel: undefined,
            contractorNip: undefined,
            contractorPesel: '',
          })}
          onChange={vi.fn()}
          onSaved={saved}
        />,
      );
      fireEvent.click(screen.getAllByRole('button')[index]);
      await screen.findByText('Zapisano dane.');
      expect(saved).toHaveBeenCalledWith(
        expect.objectContaining({ nip: null, pesel: null }),
      );
    },
  );
});
