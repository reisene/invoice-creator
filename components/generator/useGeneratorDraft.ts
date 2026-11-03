import { getSavedInvoiceSnapshot } from '@/app/actions/savedData';
import {
  generatorDraftKey,
  parseGeneratorDraft,
  parseGeneratorPreset,
  type GeneratorDraft,
} from '@/lib/invoice/generatorDraft';
import type { InvoiceFormData } from '@/types/invoiceForm';
import type { SavedInvoiceSnapshot } from '@/types/savedData';
import * as Sentry from '@sentry/nextjs';
import { useCallback, useEffect, useRef, useState } from 'react';

const PRESET_KEY = 'generator_preset_data';

type DraftConflict =
  | {
      kind: 'preset';
      draft: GeneratorDraft;
      preset: InvoiceFormData;
    }
  | {
      kind: 'server';
      draft: GeneratorDraft;
      saved: SavedInvoiceSnapshot | null;
    };

type DraftStatus = 'loading' | 'ready' | 'blocked' | 'conflict';

function captureDraftError(error: unknown) {
  Sentry.withScope((scope) => {
    scope.setTag('error.area', 'generator.draft');
    Sentry.captureException(error);
  });
}

async function findDraftConflict(
  draft: GeneratorDraft,
  initialInvoice?: SavedInvoiceSnapshot,
): Promise<DraftConflict | null> {
  if (!draft.invoiceId && !draft.creationUid) return null;

  let saved: SavedInvoiceSnapshot | null;
  if (draft.invoiceId && initialInvoice?.id === draft.invoiceId) {
    saved = initialInvoice;
  } else {
    const result = await getSavedInvoiceSnapshot(
      draft.invoiceId ?? draft.creationUid ?? '',
      !draft.invoiceId,
    );
    if (!result.ok) throw new Error(result.error);
    saved = result.data;
  }
  if (
    (draft.invoiceId && !saved) ||
    (saved && (!draft.invoiceId || saved.updatedAt !== draft.updatedAt))
  ) {
    return { kind: 'server', draft, saved };
  }
  return null;
}

function parseStoredDraft(
  rawDraft: string | null,
  rawPreset: string | null,
  formData: InvoiceFormData,
  context: string,
) {
  let stored: GeneratorDraft | null = null;
  let preset: InvoiceFormData | null = null;
  try {
    if (rawDraft) stored = parseGeneratorDraft(rawDraft);
    if (rawPreset) preset = parseGeneratorPreset(rawPreset, formData);
  } catch (error) {
    captureDraftError(error);
  }
  let draftWarning: string | null = null;
  if (rawDraft && !stored) {
    draftWarning =
      'Nie udało się odczytać wersji roboczej. Nie zostanie ona automatycznie nadpisana.';
  } else if (
    stored?.invoiceId &&
    context.startsWith('invoice:') &&
    stored.invoiceId !== context.slice('invoice:'.length)
  ) {
    draftWarning =
      'Wersja robocza dotyczy innego rachunku. Nie zostanie ona automatycznie nadpisana.';
  }
  return { stored, preset, draftWarning };
}

export function useGeneratorDraft({
  scope,
  context,
  initialDraft,
  initialInvoice,
  createNewDraft,
  allowPreset,
}: {
  scope: string;
  context: string;
  initialDraft: GeneratorDraft;
  initialInvoice?: SavedInvoiceSnapshot;
  createNewDraft: () => GeneratorDraft;
  allowPreset: boolean;
}) {
  const [initial] = useState(initialDraft);
  const [initialSavedInvoice] = useState(initialInvoice);
  const [draft, setDraft] = useState(initial);
  const draftRef = useRef(initial);
  const keyRef = useRef(generatorDraftKey(scope, context));
  const [status, setStatus] = useState<DraftStatus>('loading');
  const [conflict, setConflict] = useState<DraftConflict | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const reportedStorageFailure = useRef(false);

  const reportStorageFailure = useCallback((error: unknown) => {
    if (!reportedStorageFailure.current) {
      captureDraftError(error);
      reportedStorageFailure.current = true;
    }
    setWarning(
      'Pamięć tej karty jest niedostępna lub pełna. Zmiany mogą nie zostać odtworzone po odświeżeniu.',
    );
  }, []);

  const persist = useCallback(
    (next: GeneratorDraft): boolean => {
      try {
        sessionStorage.setItem(keyRef.current, JSON.stringify(next));
        reportedStorageFailure.current = false;
        setWarning(null);
        return true;
      } catch (error) {
        reportStorageFailure(error);
        return false;
      }
    },
    [reportStorageFailure],
  );

  const applyDraft = useCallback(
    (next: GeneratorDraft, save: boolean): boolean => {
      draftRef.current = next;
      setDraft(next);
      setNotice(null);
      return !save || persist(next);
    },
    [persist],
  );

  function updateDraft(
    patch: Partial<Omit<GeneratorDraft, 'version'>>,
  ): boolean {
    return applyDraft({ ...draftRef.current, ...patch }, true);
  }

  useEffect(() => {
    let active = true;

    async function restoreStoredDraft(stored: GeneratorDraft) {
      try {
        const found = await findDraftConflict(stored, initialSavedInvoice);
        if (!active) return;
        if (found) {
          setConflict(found);
          setStatus('conflict');
        } else {
          applyDraft(stored, false);
          setStatus('ready');
        }
      } catch (error) {
        if (!active) return;
        captureDraftError(error);
        setWarning(
          'Nie udało się sprawdzić zapisanej wersji rachunku. Wersja robocza pozostaje w pamięci karty.',
        );
        setStatus('blocked');
      }
    }

    async function load() {
      let rawDraft: string | null;
      let rawPreset: string | null;
      try {
        rawDraft = sessionStorage.getItem(keyRef.current);
        rawPreset = allowPreset ? sessionStorage.getItem(PRESET_KEY) : null;
      } catch (error) {
        if (active) {
          reportStorageFailure(error);
          setStatus('ready');
        }
        return;
      }

      const { stored, preset, draftWarning } = parseStoredDraft(
        rawDraft,
        rawPreset,
        initial.formData,
        context,
      );
      if (draftWarning) {
        if (active) {
          setWarning(draftWarning);
          setStatus('blocked');
        }
        return;
      }
      if (rawPreset && !preset && active) {
        setWarning('Nie udało się odczytać wybranego wzorca formularza.');
      }
      if (stored && preset) {
        if (active) {
          setConflict({ kind: 'preset', draft: stored, preset });
          setStatus('conflict');
        }
        return;
      }
      if (preset) {
        const next: GeneratorDraft = { version: 1, formData: preset };
        if (active) {
          try {
            sessionStorage.removeItem(PRESET_KEY);
          } catch (error) {
            reportStorageFailure(error);
          }
          applyDraft(next, true);
          setStatus('ready');
        }
        return;
      }
      if (stored) {
        await restoreStoredDraft(stored);
        return;
      }
      if (active) setStatus('ready');
    }

    void load();
    return () => {
      active = false;
    };
  }, [
    allowPreset,
    applyDraft,
    context,
    initial,
    initialSavedInvoice,
    reportStorageFailure,
    retry,
  ]);

  async function chooseDraft() {
    if (!conflict) return;
    if (conflict.kind === 'server') {
      const { saved } = conflict;
      const next: GeneratorDraft = saved
        ? {
            ...conflict.draft,
            invoiceId: saved.id,
            invoiceNumber: saved.invoiceNumber,
            numberReservation: undefined,
            updatedAt: saved.updatedAt,
            creationUid: undefined,
          }
        : {
            ...conflict.draft,
            invoiceId: undefined,
            invoiceNumber: undefined,
            numberReservation: undefined,
            updatedAt: undefined,
            creationUid: undefined,
          };
      applyDraft(next, true);
      setConflict(null);
      setStatus('ready');
      return;
    }

    try {
      sessionStorage.removeItem(PRESET_KEY);
    } catch (error) {
      reportStorageFailure(error);
    }
    setConflict(null);
    setStatus('loading');
    try {
      const found = await findDraftConflict(
        conflict.draft,
        initialSavedInvoice,
      );
      if (found) {
        setConflict(found);
        setStatus('conflict');
      } else {
        applyDraft(conflict.draft, false);
        setStatus('ready');
      }
    } catch (error) {
      captureDraftError(error);
      setWarning(
        'Nie udało się sprawdzić zapisanej wersji rachunku. Wersja robocza pozostaje w pamięci karty.',
      );
      setStatus('blocked');
    }
  }

  function chooseAlternative() {
    if (!conflict) return;
    if (conflict.kind === 'preset') {
      try {
        sessionStorage.removeItem(PRESET_KEY);
      } catch (error) {
        reportStorageFailure(error);
      }
      applyDraft({ version: 1, formData: conflict.preset }, true);
    } else if (conflict.saved) {
      applyDraft(
        {
          version: 1,
          formData: conflict.saved.data,
          invoiceId: conflict.saved.id,
          invoiceNumber: conflict.saved.invoiceNumber,
          updatedAt: conflict.saved.updatedAt,
        },
        true,
      );
    } else {
      applyDraft(createNewDraft(), true);
    }
    setConflict(null);
    setStatus('ready');
  }

  async function checkForServerConflict(): Promise<boolean> {
    const current = draftRef.current;
    if (!current.invoiceId && !current.creationUid) return false;
    try {
      const found = await findDraftConflict(current);
      if (
        draftRef.current.invoiceId !== current.invoiceId ||
        draftRef.current.creationUid !== current.creationUid ||
        draftRef.current.updatedAt !== current.updatedAt
      ) {
        return false;
      }
      if (!found) return false;
      setConflict({ ...found, draft: draftRef.current });
      setStatus('conflict');
      return true;
    } catch (error) {
      captureDraftError(error);
      setWarning(
        'Nie udało się pobrać aktualnej wersji rachunku. Spróbuj ponownie.',
      );
      return false;
    }
  }

  function markSaved(saved: {
    id: string;
    invoiceNumber: string;
    updatedAt: string;
  }) {
    const next: GeneratorDraft = {
      ...draftRef.current,
      invoiceId: saved.id,
      invoiceNumber: saved.invoiceNumber,
      numberReservation: undefined,
      updatedAt: saved.updatedAt,
      creationUid: undefined,
    };
    applyDraft(next, true);

    const destination = generatorDraftKey(scope, `invoice:${saved.id}`);
    if (destination === keyRef.current) return;
    try {
      if (sessionStorage.getItem(destination) !== null) {
        setWarning(
          'Dla tego rachunku istnieje inna wersja robocza w tej karcie. Bieżąca wersja pozostaje pod dotychczasowym adresem.',
        );
        return;
      }
      sessionStorage.setItem(destination, JSON.stringify(next));
      sessionStorage.removeItem(keyRef.current);
      keyRef.current = destination;
      window.history.replaceState(
        null,
        '',
        `/generator?invoice=${encodeURIComponent(saved.id)}`,
      );
    } catch (error) {
      reportStorageFailure(error);
      window.history.replaceState(
        null,
        '',
        `/generator?invoice=${encodeURIComponent(saved.id)}`,
      );
    }
  }

  function clearDraft() {
    try {
      sessionStorage.removeItem(keyRef.current);
      setWarning(null);
      if (status === 'blocked') {
        applyDraft(initial, false);
        setStatus('ready');
      }
      setNotice(
        'Wersja robocza została usunięta z pamięci karty. Kolejna zmiana formularza utworzy nową.',
      );
    } catch (error) {
      reportStorageFailure(error);
    }
  }

  return {
    draft,
    status,
    conflict,
    warning,
    notice,
    updateDraft,
    markSaved,
    clearDraft,
    chooseDraft,
    chooseAlternative,
    checkForServerConflict,
    retryLoad: () => {
      setWarning(null);
      setStatus('loading');
      setRetry((value) => value + 1);
    },
  };
}
