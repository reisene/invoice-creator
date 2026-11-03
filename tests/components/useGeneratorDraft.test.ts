// @vitest-environment node
import { useGeneratorDraft } from '@/components/generator/useGeneratorDraft';
import {
  generatorDraftKey,
  parseGeneratorDraft,
  type GeneratorDraft,
} from '@/lib/invoice/generatorDraft';
import type { SavedInvoiceSnapshot } from '@/types/savedData';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { testing } from '../app/dom';
import { formData } from './fixtures';

const mocks = vi.hoisted(() => ({ snapshot: vi.fn(), capture: vi.fn() }));
vi.mock('@/app/actions/savedData', () => ({
  getSavedInvoiceSnapshot: mocks.snapshot,
}));
vi.mock('@sentry/nextjs', () => ({
  withScope: (run: (scope: { setTag: () => void }) => void) =>
    run({ setTag: vi.fn() }),
  captureException: mocks.capture,
}));
const { act, cleanup, renderHook, waitFor } = testing;
const key = generatorDraftKey('user-a', 'new');
const uid = 'd92da4c7-c999-4856-96d6-7681b1b96f71';
const initial: GeneratorDraft = { version: 1, formData: formData() };
const edited: GeneratorDraft = {
  ...initial,
  formData: formData({ grossAmount: 7000 }),
};
const saved: SavedInvoiceSnapshot = {
  id: 'invoice-1',
  invoiceNumber: '1/2026',
  updatedAt: '2026-10-22T00:00:00.000Z',
  data: formData({ grossAmount: 6000 }),
};
function mount(
  overrides: Partial<Parameters<typeof useGeneratorDraft>[0]> = {},
) {
  return renderHook(() =>
    useGeneratorDraft({
      scope: 'user-a',
      context: 'new',
      initialDraft: initial,
      createNewDraft: () => initial,
      allowPreset: true,
      ...overrides,
    }),
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/generator');
  mocks.snapshot.mockResolvedValue({ ok: true, data: null });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('generator draft persistence', () => {
  it('saves edits synchronously and restores them after remount', async () => {
    const first = mount();
    await waitFor(() => expect(first.result.current.status).toBe('ready'));
    act(() => {
      expect(
        first.result.current.updateDraft({ formData: edited.formData }),
      ).toBe(true);
      expect(JSON.parse(sessionStorage.getItem(key)!)).toMatchObject(edited);
    });
    first.unmount();
    const next = mount();
    await waitFor(() => expect(next.result.current.status).toBe('ready'));
    expect(next.result.current.draft.formData.grossAmount).toBe(7000);
  });

  it('does not read drafts belonging to a different account or document', async () => {
    sessionStorage.setItem(key, JSON.stringify(edited));
    const other = mount({ scope: 'user-b' });
    await waitFor(() => expect(other.result.current.status).toBe('ready'));
    expect(other.result.current.draft).toEqual(initial);
    other.unmount();
    const invoice = mount({ context: 'invoice:other', allowPreset: false });
    await waitFor(() => expect(invoice.result.current.status).toBe('ready'));
    expect(invoice.result.current.draft).toEqual(initial);
  });

  it.each(['{', 'null', '{"version":2}'])(
    'preserves unreadable draft %s until explicitly cleared',
    async (raw) => {
      sessionStorage.setItem(key, raw);
      const hook = mount();
      await waitFor(() => expect(hook.result.current.status).toBe('blocked'));
      expect(hook.result.current.warning).toContain('Nie udało się odczytać');
      expect(sessionStorage.getItem(key)).toBe(raw);
      act(() => hook.result.current.clearDraft());
      expect(hook.result.current.status).toBe('ready');
      expect(sessionStorage.getItem(key)).toBeNull();
      expect(hook.result.current.notice).toContain('usunięta');
    },
  );

  it('blocks a draft stored under the wrong invoice context', async () => {
    const context = 'invoice:other';
    const raw = JSON.stringify({
      ...edited,
      invoiceId: saved.id,
      updatedAt: saved.updatedAt,
    });
    sessionStorage.setItem(generatorDraftKey('user-a', context), raw);
    const hook = mount({ context, allowPreset: false });
    await waitFor(() => expect(hook.result.current.status).toBe('blocked'));
    expect(hook.result.current.warning).toContain('innego rachunku');
    expect(mocks.snapshot).not.toHaveBeenCalled();
  });

  it('consumes a preset and persists it, but never consumes one on an invoice page', async () => {
    sessionStorage.setItem(
      'generator_preset_data',
      JSON.stringify({ grossAmount: 8000 }),
    );
    const invoice = mount({ context: 'invoice:1', allowPreset: false });
    await waitFor(() => expect(invoice.result.current.status).toBe('ready'));
    expect(sessionStorage.getItem('generator_preset_data')).not.toBeNull();
    invoice.unmount();
    const hook = mount();
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    expect(hook.result.current.draft.formData.grossAmount).toBe(8000);
    expect(sessionStorage.getItem('generator_preset_data')).toBeNull();
    expect(JSON.parse(sessionStorage.getItem(key)!).formData.grossAmount).toBe(
      8000,
    );
  });

  it.each(['draft', 'preset'])(
    'asks before replacing a draft with a preset; selects %s',
    async (choice) => {
      sessionStorage.setItem(key, JSON.stringify(edited));
      sessionStorage.setItem(
        'generator_preset_data',
        JSON.stringify({ grossAmount: 8000 }),
      );
      const hook = mount();
      await waitFor(() => expect(hook.result.current.status).toBe('conflict'));
      expect(hook.result.current.conflict?.kind).toBe('preset');
      await act(async () => {
        if (choice === 'draft') await hook.result.current.chooseDraft();
        else hook.result.current.chooseAlternative();
      });
      expect(hook.result.current.status).toBe('ready');
      expect(hook.result.current.draft.formData.grossAmount).toBe(
        choice === 'draft' ? 7000 : 8000,
      );
      expect(sessionStorage.getItem('generator_preset_data')).toBeNull();
    },
  );

  it('warns about invalid presets without blocking an otherwise empty generator', async () => {
    sessionStorage.setItem('generator_preset_data', 'null');
    const hook = mount();
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    expect(hook.result.current.warning).toContain('wzorca');
  });

  it('reports read failures and permits in-memory editing', async () => {
    const error = new Error('blocked');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw error;
    });
    const hook = mount();
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    expect(hook.result.current.warning).toContain('Pamięć tej karty');
    expect(mocks.capture).toHaveBeenCalledWith(error);
  });

  it('returns false on quota failure, reports it once and clears the warning after recovery', async () => {
    const hook = mount();
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    const error = new Error('quota');
    const storage = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw error;
      });
    act(() => {
      expect(hook.result.current.updateDraft({ creationUid: uid })).toBe(false);
      expect(
        hook.result.current.updateDraft({ formData: edited.formData }),
      ).toBe(false);
    });
    expect(hook.result.current.draft.creationUid).toBe(uid);
    expect(mocks.capture).toHaveBeenCalledExactlyOnceWith(error);
    storage.mockRestore();
    act(() => {
      expect(
        hook.result.current.updateDraft({ formData: edited.formData }),
      ).toBe(true);
    });
    expect(hook.result.current.warning).toBeNull();
  });
});

describe('generator server conflicts and save identity', () => {
  it('uses the initial server snapshot when its version matches', async () => {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        ...edited,
        invoiceId: saved.id,
        updatedAt: saved.updatedAt,
      }),
    );
    const hook = mount({ initialInvoice: saved });
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    expect(hook.result.current.draft.formData.grossAmount).toBe(7000);
    expect(mocks.snapshot).not.toHaveBeenCalled();
  });

  it.each(['draft', 'server'])(
    'recovers an interrupted creation without duplicating it; selects %s',
    async (choice) => {
      sessionStorage.setItem(
        key,
        JSON.stringify({ ...edited, creationUid: uid }),
      );
      mocks.snapshot.mockResolvedValue({ ok: true, data: saved });
      const hook = mount();
      await waitFor(() => expect(hook.result.current.status).toBe('conflict'));
      expect(mocks.snapshot).toHaveBeenCalledWith(uid, true);
      await act(async () => {
        if (choice === 'draft') await hook.result.current.chooseDraft();
        else hook.result.current.chooseAlternative();
      });
      expect(hook.result.current.draft).toMatchObject({
        invoiceId: saved.id,
        updatedAt: saved.updatedAt,
        formData: { grossAmount: choice === 'draft' ? 7000 : 6000 },
      });
      expect(hook.result.current.draft.creationUid).toBeUndefined();
    },
  );

  it.each(['draft', 'new'])(
    'handles deletion of the server copy; selects %s',
    async (choice) => {
      sessionStorage.setItem(
        key,
        JSON.stringify({
          ...edited,
          invoiceId: saved.id,
          updatedAt: saved.updatedAt,
        }),
      );
      const hook = mount();
      await waitFor(() => expect(hook.result.current.status).toBe('conflict'));
      await act(async () => {
        if (choice === 'draft') await hook.result.current.chooseDraft();
        else hook.result.current.chooseAlternative();
      });
      expect(hook.result.current.status).toBe('ready');
      expect(hook.result.current.draft.invoiceId).toBeUndefined();
      expect(hook.result.current.draft.formData.grossAmount).toBe(
        choice === 'draft' ? 7000 : initial.formData.grossAmount,
      );
    },
  );

  it('keeps the draft blocked after lookup failure and allows retry', async () => {
    const raw = JSON.stringify({ ...edited, creationUid: uid });
    sessionStorage.setItem(key, raw);
    mocks.snapshot.mockResolvedValueOnce({ ok: false, error: 'network' });
    const hook = mount();
    await waitFor(() => expect(hook.result.current.status).toBe('blocked'));
    expect(sessionStorage.getItem(key)).toBe(raw);
    expect(mocks.capture).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'network' }),
    );
    act(() => hook.result.current.retryLoad());
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    expect(hook.result.current.draft.creationUid).toBe(uid);
  });

  it.each(['resolve', 'reject'] as const)(
    'ignores a late restore %s after unmount without consuming stored data',
    async (outcome) => {
      const raw = JSON.stringify({ ...edited, creationUid: uid });
      sessionStorage.setItem(key, raw);
      let resolve!: (value: { ok: true; data: SavedInvoiceSnapshot }) => void;
      let reject!: (reason: Error) => void;
      mocks.snapshot.mockReturnValue(
        new Promise((done, fail) => {
          resolve = done;
          reject = fail;
        }),
      );
      const hook = mount();
      await waitFor(() => expect(mocks.snapshot).toHaveBeenCalledOnce());
      expect(hook.result.current.status).toBe('loading');
      hook.unmount();
      await act(async () => {
        if (outcome === 'resolve') resolve({ ok: true, data: saved });
        else reject(new Error('late failure'));
      });
      expect(sessionStorage.getItem(key)).toBe(raw);
      expect(mocks.capture).not.toHaveBeenCalled();
    },
  );

  it('ignores a previous restore response when a retry has already restored the draft', async () => {
    const raw = JSON.stringify({ ...edited, creationUid: uid });
    sessionStorage.setItem(key, raw);
    let resolve!: (value: { ok: true; data: SavedInvoiceSnapshot }) => void;
    mocks.snapshot.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const hook = mount();
    await waitFor(() => expect(mocks.snapshot).toHaveBeenCalledOnce());
    act(() => hook.result.current.retryLoad());
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    await act(async () => resolve({ ok: true, data: saved }));
    expect(hook.result.current.status).toBe('ready');
    expect(hook.result.current.conflict).toBeNull();
    expect(hook.result.current.draft).toEqual(parseGeneratorDraft(raw));
    expect(sessionStorage.getItem(key)).toBe(raw);
  });

  it('ignores a stale conflict response after a different saved version is adopted', async () => {
    let resolve!: (value: { ok: true; data: SavedInvoiceSnapshot }) => void;
    mocks.snapshot.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const hook = mount();
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    act(() => {
      hook.result.current.updateDraft({ creationUid: uid });
    });
    let check!: Promise<boolean>;
    act(() => {
      check = hook.result.current.checkForServerConflict();
    });
    act(() => hook.result.current.markSaved({ ...saved, id: 'other' }));
    await act(async () => {
      resolve({ ok: true, data: saved });
      expect(await check).toBe(false);
    });
    expect(hook.result.current.status).toBe('ready');
    expect(hook.result.current.draft.invoiceId).toBe('other');
  });

  it('persists saved metadata under the invoice key and updates the address', async () => {
    const hook = mount();
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    act(() => {
      hook.result.current.updateDraft({
        creationUid: uid,
        invoiceNumber: '1/2026',
        numberReservation: { number: '1/2026', token: 'token' },
      });
      hook.result.current.markSaved(saved);
    });
    expect(sessionStorage.getItem(key)).toBeNull();
    const invoiceKey = generatorDraftKey('user-a', `invoice:${saved.id}`);
    expect(JSON.parse(sessionStorage.getItem(invoiceKey)!)).toMatchObject({
      invoiceId: saved.id,
      updatedAt: saved.updatedAt,
    });
    expect(hook.result.current.draft.creationUid).toBeUndefined();
    expect(hook.result.current.draft.numberReservation).toBeUndefined();
    expect(window.location.search).toBe('?invoice=invoice-1');
    act(() => hook.result.current.clearDraft());
    expect(sessionStorage.getItem(invoiceKey)).toBeNull();
  });

  it('does not overwrite an existing destination draft after saving', async () => {
    const destination = generatorDraftKey('user-a', `invoice:${saved.id}`);
    const existing = JSON.stringify(edited);
    sessionStorage.setItem(destination, existing);
    const hook = mount();
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    act(() => hook.result.current.markSaved(saved));
    expect(sessionStorage.getItem(destination)).toBe(existing);
    expect(JSON.parse(sessionStorage.getItem(key)!).invoiceId).toBe(saved.id);
    expect(hook.result.current.warning).toContain('inna wersja robocza');
    expect(window.location.search).toBe('');
  });
});
