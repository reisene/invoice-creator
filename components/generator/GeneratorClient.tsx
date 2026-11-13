'use client';

import {
  getYearToDateInvoiceTaxableIncome,
  reserveInvoiceNumber,
  saveInvoice,
} from '@/app/actions/savedData';
import InvoiceForm from '@/components/generator/InvoiceForm';
import InvoicePreview from '@/components/generator/InvoicePreview';
import SavedPartiesPanel from '@/components/generator/SavedPartiesPanel';
import { useGeneratorDraft } from '@/components/generator/useGeneratorDraft';
import {
  cleanPolishBankAccount,
  formatPolishBankAccount,
} from '@/lib/invoice/bankUtils';
import { calculateInvoice } from '@/lib/invoice/calculateInvoice';
import type { GeneratorDraft } from '@/lib/invoice/generatorDraft';
import {
  isValidDate,
  isValidPesel,
  validateInvoiceForm,
} from '@/lib/invoice/validateInvoiceForm';
import type { InvoiceData } from '@/types/invoice';
import type { InvoiceFormData } from '@/types/invoiceForm';
import type {
  SavedInvoiceSnapshot,
  SavedPartyDto,
  UserBankAccountDto,
} from '@/types/savedData';
import type { TaxParams } from '@/types/taxParams';
import * as Sentry from '@sentry/nextjs';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Col, Container, Modal, Row } from 'react-bootstrap';

function getInitialData(
  savedBankAccount?: UserBankAccountDto | null,
): InvoiceFormData {
  const now = new Date();
  const toLocalIso = (d: Date) =>
    [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');
  const today = toLocalIso(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    clientType: 'company',
    clientName: '',
    clientAddress: '',
    clientNip: undefined,
    clientPesel: undefined,

    contractorName: '',
    contractorAddress: '',
    contractorPesel: '',
    contractorNip: undefined,

    contractNumber: undefined,
    contractDate: today,
    issuePlace: '',
    issueDate: today,
    periodStart: toLocalIso(monthStart),
    periodEnd: toLocalIso(monthEnd),
    contractType: 'monthly',

    grossAmount: undefined,
    hourlyRate: undefined,
    hoursWorked: undefined,

    contractorStatus: 'standard',
    voluntarySickness: false,
    costType: '20',
    youngRelief: false,
    yearToDateTaxableIncome: 0,
    yearToDateYoungReliefIncome: 0,

    noTaxAdvanceRequest: false,
    taxReduction: true,
    taxReductionAmount: 300,
    paymentMethod: 'TRANSFER',
    transferTarget: 'SAVED_ACCOUNT',
    bankAccountHolder: savedBankAccount?.accountHolder,
    bankName: savedBankAccount?.bankName,
    bankAccountNumber: savedBankAccount?.accountNumber
      ? formatPolishBankAccount(savedBankAccount.accountNumber)
      : undefined,
  };
}

interface GeneratorClientProps {
  taxParams: TaxParams[];
  signedIn: boolean;
  draftScope: string;
  draftContext: string;
  initialParties: SavedPartyDto[];
  bankAccount: UserBankAccountDto | null;
  initialInvoice?: SavedInvoiceSnapshot;
  duplicateData?: InvoiceFormData;
}

type DraftState = ReturnType<typeof useGeneratorDraft>;
type IncomeResult =
  | { key: string; ok: true; amount: number }
  | { key: string; ok: false; error: string };

function getSavedIncomeError(
  signedIn: boolean,
  status: DraftState['status'],
  periodStart: string,
  taxYear: number,
  contractorPesel: string,
  currentIncomeResult: IncomeResult | undefined,
): string | null {
  return !signedIn || status !== 'ready'
    ? null
    : !isValidDate(periodStart) || taxYear < 2000
      ? 'Podaj prawidłowy początek okresu rozliczeniowego.'
      : !isValidPesel(contractorPesel)
        ? 'Podaj prawidłowy PESEL zleceniobiorcy.'
        : currentIncomeResult?.ok === false
          ? currentIncomeResult.error
          : null;
}

function useSavedInvoiceIncome(signedIn: boolean, draftState: DraftState) {
  const { formData, invoiceId } = draftState.draft;
  const [incomeResult, setIncomeResult] = useState<IncomeResult>();
  const [incomeRetry, setIncomeRetry] = useState(0);
  const taxYear = Number(formData.periodStart.slice(0, 4));
  const periodStart = formData.periodStart;
  const contractorPesel = formData.contractorPesel;
  const validIncomeInputs =
    isValidDate(periodStart) &&
    taxYear >= 2000 &&
    isValidPesel(contractorPesel);
  const incomeKey = JSON.stringify([periodStart, contractorPesel, invoiceId]);
  const currentIncomeResult =
    incomeResult?.key === incomeKey ? incomeResult : undefined;
  const savedInvoiceTaxableIncome =
    currentIncomeResult?.ok === true ? currentIncomeResult.amount : 0;
  const isLoadingSavedIncome =
    signedIn &&
    draftState.status === 'ready' &&
    validIncomeInputs &&
    !currentIncomeResult;
  const savedIncomeError = getSavedIncomeError(
    signedIn,
    draftState.status,
    periodStart,
    taxYear,
    contractorPesel,
    currentIncomeResult,
  );

  useEffect(() => {
    if (!signedIn || draftState.status !== 'ready' || !validIncomeInputs)
      return;
    let active = true;
    const timeout = window.setTimeout(() => {
      void getYearToDateInvoiceTaxableIncome(
        periodStart,
        contractorPesel,
        invoiceId,
      )
        .then((result) => {
          if (!active) return;
          setIncomeResult(
            result.ok
              ? { key: incomeKey, ok: true, amount: result.data }
              : { key: incomeKey, ok: false, error: result.error },
          );
        })
        .catch((error: unknown) => {
          Sentry.withScope((scope) => {
            scope.setTag('error.area', 'generator.invoice.annual-income');
            Sentry.captureException(error);
          });
          if (active) {
            setIncomeResult({
              key: incomeKey,
              ok: false,
              error:
                'Nie udało się zsumować zapisanych rachunków. Spróbuj ponownie.',
            });
          }
        });
    }, 350);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [
    signedIn,
    draftState.status,
    validIncomeInputs,
    periodStart,
    contractorPesel,
    invoiceId,
    incomeKey,
    incomeRetry,
  ]);

  return {
    taxYear,
    periodStart,
    contractorPesel,
    incomeKey,
    currentIncomeResult,
    savedInvoiceTaxableIncome,
    isLoadingSavedIncome,
    savedIncomeError,
    setIncomeResult,
    setIncomeRetry,
  };
}

function needsProfileBankConfirmation(
  formData: InvoiceFormData,
  userBankAccount: UserBankAccountDto | null,
) {
  return (
    formData.paymentMethod === 'TRANSFER' &&
    formData.transferTarget === 'SAVED_ACCOUNT' &&
    Boolean(
      !userBankAccount ||
      cleanPolishBankAccount(formData.bankAccountNumber ?? '') !==
        cleanPolishBankAccount(userBankAccount.accountNumber) ||
      formData.bankName?.trim() !== userBankAccount.bankName.trim() ||
      formData.bankAccountHolder?.trim() !==
        userBankAccount.accountHolder.trim(),
    )
  );
}

function getProfileBankAccount(
  formData: InvoiceFormData,
  saveAccountToProfile: boolean,
): UserBankAccountDto | undefined {
  if (
    saveAccountToProfile &&
    formData.paymentMethod === 'TRANSFER' &&
    formData.transferTarget === 'SAVED_ACCOUNT' &&
    formData.bankAccountNumber &&
    formData.bankName &&
    formData.bankAccountHolder
  ) {
    return {
      accountHolder: formData.bankAccountHolder.trim(),
      bankName: formData.bankName.trim(),
      accountNumber: cleanPolishBankAccount(formData.bankAccountNumber),
    };
  }
}

function useGeneratorController({
  taxParams,
  signedIn,
  draftScope,
  draftContext,
  initialParties,
  bankAccount,
  initialInvoice,
  duplicateData,
}: GeneratorClientProps) {
  const [userBankAccount, setUserBankAccount] =
    useState<UserBankAccountDto | null>(bankAccount);
  const [initialDraft] = useState<GeneratorDraft>(() => {
    const formData = initialInvoice
      ? initialInvoice.data
      : duplicateData
        ? { ...duplicateData, issueDate: getInitialData(bankAccount).issueDate }
        : getInitialData(bankAccount);
    return {
      version: 1,
      formData,
      invoiceId: initialInvoice?.id,
      invoiceNumber: initialInvoice?.invoiceNumber,
      updatedAt: initialInvoice?.updatedAt,
    };
  });
  const draftState = useGeneratorDraft({
    scope: draftScope,
    context: draftContext,
    initialDraft,
    initialInvoice,
    createNewDraft: () => ({
      version: 1,
      formData: getInitialData(userBankAccount),
    }),
    allowPreset: draftContext === 'new',
  });
  const conflictHeadingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (draftState.conflict) conflictHeadingRef.current?.focus();
  }, [draftState.conflict]);
  const { formData, invoiceId, invoiceNumber, numberReservation, updatedAt } =
    draftState.draft;
  const setFormData = (data: InvoiceFormData) => {
    draftState.updateDraft({ formData: data });
  };
  const [parties, setParties] = useState(initialParties);
  const [isSaving, setIsSaving] = useState(false);
  const [showBankConfirmation, setShowBankConfirmation] = useState(false);
  const [showClearDraftConfirmation, setShowClearDraftConfirmation] =
    useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    variant: 'success' | 'danger';
    text: string;
  } | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const {
    taxYear,
    periodStart,
    contractorPesel,
    incomeKey,
    currentIncomeResult,
    savedInvoiceTaxableIncome,
    isLoadingSavedIncome,
    savedIncomeError,
    setIncomeResult,
    setIncomeRetry,
  } = useSavedInvoiceIncome(signedIn, draftState);
  const selectedTaxParams = [...taxParams]
    .reverse()
    .find((params) => params.year <= taxYear);

  const invoiceData: InvoiceData | null = useMemo(() => {
    if (!selectedTaxParams) return null;

    return calculateInvoice(
      {
        ...formData,
        yearToDateTaxableIncome:
          formData.yearToDateTaxableIncome +
          (signedIn ? savedInvoiceTaxableIncome : 0),
      },
      selectedTaxParams,
    );
  }, [formData, savedInvoiceTaxableIncome, selectedTaxParams, signedIn]);

  const validationErrors = useMemo(
    () => validateInvoiceForm(formData, selectedTaxParams),
    [formData, selectedTaxParams],
  );

  const needsBankConfirmation = needsProfileBankConfirmation(
    formData,
    userBankAccount,
  );

  const saveCurrentInvoice = async (saveAccountToProfile: boolean) => {
    if (
      isSaving ||
      isGeneratingPdf ||
      isLoadingSavedIncome ||
      savedIncomeError ||
      validationErrors.length > 0
    ) {
      return;
    }
    setShowBankConfirmation(false);
    setIsSaving(true);
    setSaveMessage(null);
    try {
      let creationUid = draftState.draft.creationUid;
      if (!invoiceId) {
        creationUid ??= crypto.randomUUID();
        if (!draftState.updateDraft({ creationUid })) {
          setSaveMessage({
            variant: 'danger',
            text: 'Nie można zabezpieczyć nowego rachunku przed ponownym zapisem. Udostępnij pamięć tej karty i spróbuj ponownie.',
          });
          return;
        }
      }
      const result = await saveInvoice(
        formData,
        invoiceId,
        numberReservation,
        saveAccountToProfile,
        savedInvoiceTaxableIncome,
        updatedAt,
        creationUid,
      );
      if (result.ok) {
        draftState.markSaved(result.data);
        setIncomeResult({
          key: JSON.stringify([periodStart, contractorPesel, result.data.id]),
          ok: true,
          amount: result.data.savedInvoiceTaxableIncome,
        });
        const profileBankAccount = getProfileBankAccount(
          formData,
          saveAccountToProfile,
        );
        if (profileBankAccount) setUserBankAccount(profileBankAccount);
        setSaveMessage({ variant: 'success', text: 'Rachunek zapisany.' });
      } else {
        if (result.currentSavedInvoiceTaxableIncome !== undefined) {
          setIncomeResult({
            key: incomeKey,
            ok: true,
            amount: result.currentSavedInvoiceTaxableIncome,
          });
        }
        if (result.invoiceChanged) {
          await draftState.checkForServerConflict();
        }
        setSaveMessage({ variant: 'danger', text: result.error });
      }
    } catch (error) {
      Sentry.withScope((scope) => {
        scope.setTag('error.area', 'generator.invoice.save');
        Sentry.captureException(error);
      });
      setSaveMessage({
        variant: 'danger',
        text: 'Nie udało się zapisać rachunku. Spróbuj ponownie.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    if (
      isSaving ||
      isGeneratingPdf ||
      isLoadingSavedIncome ||
      savedIncomeError ||
      validationErrors.length > 0
    ) {
      return;
    }
    if (needsBankConfirmation) setShowBankConfirmation(true);
    else void saveCurrentInvoice(false);
  };

  const handleDownloadPdf = async () => {
    if (
      !invoiceData ||
      isSaving ||
      isGeneratingPdf ||
      isLoadingSavedIncome ||
      savedIncomeError ||
      validationErrors.length > 0
    ) {
      return;
    }

    setIsGeneratingPdf(true);
    setPdfError(null);

    try {
      const [{ pdf }, { default: createInvoicePdfDocument }] =
        await Promise.all([
          import('@react-pdf/renderer'),
          import('./InvoicePdfDocument'),
        ]);

      let number = invoiceNumber;
      if (!number) {
        const result = await reserveInvoiceNumber(new Date().getFullYear());
        if (!result.ok) {
          setPdfError(result.error);
          return;
        }
        number = result.data.number;
        draftState.updateDraft({
          invoiceNumber: number,
          numberReservation: result.data,
        });
      }

      const blob = await pdf(
        createInvoicePdfDocument(invoiceData, number),
      ).toBlob();
      const objectUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      const filenamePart = number.replace(/[^a-zA-Z0-9_-]/g, '_');

      downloadLink.href = objectUrl;
      downloadLink.download = `rachunek-${filenamePart}.pdf`;
      document.body.append(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 1000);
    } catch (error) {
      Sentry.withScope((scope) => {
        scope.setTag('error.area', 'generator.invoice.pdf');
        Sentry.captureException(error);
      });
      setPdfError('Nie udało się wygenerować pliku PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return {
    signedIn,
    draftState,
    conflictHeadingRef,
    formData,
    invoiceId,
    invoiceNumber,
    setFormData,
    parties,
    setParties,
    isSaving,
    isGeneratingPdf,
    showBankConfirmation,
    setShowBankConfirmation,
    showClearDraftConfirmation,
    setShowClearDraftConfirmation,
    saveMessage,
    setSaveMessage,
    pdfError,
    currentIncomeResult,
    savedInvoiceTaxableIncome,
    isLoadingSavedIncome,
    savedIncomeError,
    setIncomeResult,
    setIncomeRetry,
    selectedTaxParams,
    invoiceData,
    validationErrors,
    userBankAccount,
    setUserBankAccount,
    taxYear,
    handleSave,
    handleDownloadPdf,
    saveCurrentInvoice,
  };
}

type GeneratorController = ReturnType<typeof useGeneratorController>;

export default function GeneratorClient(props: GeneratorClientProps) {
  // One unconditional controller preserves state through draft gates and modals.
  const controller = useGeneratorController(props);
  return (
    <Container className='py-4'>
      <h1 className='mb-4'>Generator rachunku do umowy zlecenia</h1>
      <DraftGate controller={controller}>
        <GeneratorWorkspace controller={controller} />
      </DraftGate>
      <BankConfirmation controller={controller} />
      <ClearDraftConfirmation controller={controller} />
    </Container>
  );
}

function DraftGate({
  controller,
  children,
}: {
  controller: GeneratorController;
  children: ReactNode;
}) {
  const {
    draftState,
    conflictHeadingRef,
    setSaveMessage,
    setShowClearDraftConfirmation,
  } = controller;
  return (
    <>
      {draftState.warning ? (
        <Alert variant='warning' role='alert'>
          {draftState.warning}
        </Alert>
      ) : null}
      {draftState.notice ? (
        <Alert variant='info' role='status'>
          {draftState.notice}
        </Alert>
      ) : null}

      {draftState.status === 'loading' ? (
        <p role='status'>Odczytywanie wersji roboczej…</p>
      ) : draftState.status === 'blocked' ? (
        <div className='d-flex flex-wrap gap-2'>
          <Button variant='outline-primary' onClick={draftState.retryLoad}>
            Spróbuj ponownie
          </Button>
          <Button
            variant='outline-danger'
            onClick={() => {
              setShowClearDraftConfirmation(true);
            }}
          >
            Usuń wersję roboczą i otwórz formularz
          </Button>
        </div>
      ) : draftState.conflict ? (
        <Alert variant='warning'>
          <h2 className='h5' ref={conflictHeadingRef} tabIndex={-1}>
            Wybierz wersję formularza
          </h2>
          <p>
            {draftState.conflict.kind === 'preset'
              ? 'W tej karcie znajduje się niezapisana wersja robocza, a także wybrany wzorzec. Wybranie jednej wersji zastąpi drugą w pamięci karty.'
              : draftState.conflict.saved
                ? 'Istnieje zapisany rachunek odpowiadający tej wersji roboczej lub jego zapisana wersja uległa zmianie. Wybierz, którą wersję chcesz dalej edytować.'
                : 'Rachunek z wersji roboczej nie istnieje już na Twoim koncie. Możesz odtworzyć dane jako nowy rachunek albo odrzucić wersję roboczą.'}
          </p>
          <div className='d-flex flex-wrap gap-2'>
            <Button
              variant='primary'
              onClick={() => {
                setSaveMessage(null);
                void draftState.chooseDraft();
              }}
            >
              {draftState.conflict.kind === 'server' &&
              !draftState.conflict.saved
                ? 'Odtwórz jako nowy rachunek'
                : 'Wybierz wersję roboczą'}
            </Button>
            <Button
              variant='outline-primary'
              onClick={() => {
                setSaveMessage(null);
                draftState.chooseAlternative();
              }}
            >
              {draftState.conflict.kind === 'preset'
                ? 'Wybierz wzorzec'
                : draftState.conflict.saved
                  ? 'Wybierz zapisany rachunek'
                  : 'Odrzuć wersję roboczą'}
            </Button>
          </div>
        </Alert>
      ) : (
        children
      )}
    </>
  );
}

function GeneratorWorkspace({
  controller,
}: {
  controller: GeneratorController;
}) {
  const {
    setShowClearDraftConfirmation,
    isSaving,
    isGeneratingPdf,
    signedIn,
    parties,
    formData,
    setFormData,
    setParties,
    selectedTaxParams,
    userBankAccount,
    savedInvoiceTaxableIncome,
    isLoadingSavedIncome,
    savedIncomeError,
    setUserBankAccount,
  } = controller;
  return (
    <>
      <div className='d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3'>
        <p className='small text-body-secondary mb-0'>
          Wersja robocza jest zapisywana w pamięci tej karty, także z numerem
          PESEL i konta.
        </p>
        <Button
          variant='outline-secondary'
          size='sm'
          onClick={() => {
            setShowClearDraftConfirmation(true);
          }}
        >
          Usuń wersję roboczą z tej karty
        </Button>
      </div>
      <Row className='g-4'>
        <Col lg={6}>
          <fieldset disabled={isSaving || isGeneratingPdf}>
            <legend className='visually-hidden'>Dane rachunku</legend>
            {signedIn ? (
              <SavedPartiesPanel
                parties={parties}
                data={formData}
                onChange={setFormData}
                onSaved={(party) => {
                  setParties((prev) => [...prev, party]);
                }}
              />
            ) : null}
            <InvoiceForm
              data={formData}
              onChange={setFormData}
              taxParams={selectedTaxParams}
              bankAccount={userBankAccount}
              signedIn={signedIn}
              savedInvoiceTaxableIncome={savedInvoiceTaxableIncome}
              isLoadingSavedIncome={isLoadingSavedIncome}
              savedIncomeError={savedIncomeError}
              onBankAccountSaved={setUserBankAccount}
            />
          </fieldset>
        </Col>

        <Col lg={6}>
          <GeneratorPreview controller={controller} />
        </Col>
      </Row>
    </>
  );
}

function GeneratorPreview({ controller }: { controller: GeneratorController }) {
  const {
    invoiceData,
    selectedTaxParams,
    signedIn,
    isLoadingSavedIncome,
    savedIncomeError,
    currentIncomeResult,
    draftState,
    setIncomeResult,
    setIncomeRetry,
    invoiceNumber,
    taxYear,
  } = controller;
  return (
    <>
      {invoiceData && selectedTaxParams ? (
        <div className='preview-sticky-wrapper'>
          {signedIn && (isLoadingSavedIncome || savedIncomeError) ? (
            <Alert variant='warning' role='status'>
              Podgląd nie uwzględnia jeszcze wcześniejszych rachunków. Zapis i
              pobranie PDF będą dostępne po ich sprawdzeniu.
              {currentIncomeResult?.ok === false ? (
                <Button
                  className='ms-2'
                  variant='outline-primary'
                  size='sm'
                  onClick={() => {
                    void draftState.checkForServerConflict().then((found) => {
                      if (!found) {
                        setIncomeResult(undefined);
                        setIncomeRetry((value) => value + 1);
                      }
                    });
                  }}
                >
                  Spróbuj ponownie
                </Button>
              ) : null}
            </Alert>
          ) : null}
          <InvoicePreview
            data={invoiceData}
            taxParams={selectedTaxParams}
            invoiceNumber={invoiceNumber}
          />
          <InvoiceActions controller={controller} />
        </div>
      ) : (
        <Alert variant='danger'>
          Brak parametrów podatkowych dla roku {taxYear}. Nie można obliczyć
          rachunku.
        </Alert>
      )}
    </>
  );
}

function InvoiceActions({ controller }: { controller: GeneratorController }) {
  const {
    signedIn,
    handleSave,
    isSaving,
    isGeneratingPdf,
    isLoadingSavedIncome,
    savedIncomeError,
    validationErrors,
    invoiceId,
    handleDownloadPdf,
  } = controller;
  return (
    <>
      <div className='mt-3 d-flex justify-content-end gap-2'>
        {signedIn ? (
          <Button
            variant='outline-primary'
            onClick={handleSave}
            disabled={
              isSaving ||
              isGeneratingPdf ||
              isLoadingSavedIncome ||
              savedIncomeError !== null ||
              validationErrors.length > 0
            }
          >
            {isSaving
              ? 'Zapisywanie…'
              : invoiceId
                ? 'Zaktualizuj rachunek'
                : 'Zapisz rachunek'}
          </Button>
        ) : null}
        <Button
          variant='primary'
          onClick={handleDownloadPdf}
          disabled={
            isGeneratingPdf ||
            isSaving ||
            (signedIn && (isLoadingSavedIncome || savedIncomeError !== null)) ||
            validationErrors.length > 0
          }
        >
          {isGeneratingPdf ? 'Generowanie PDF…' : 'Pobierz PDF'}
        </Button>
      </div>
      <InvoiceFeedback controller={controller} />
    </>
  );
}

function InvoiceFeedback({ controller }: { controller: GeneratorController }) {
  const { signedIn, saveMessage, validationErrors, pdfError } = controller;
  return (
    <>
      {!signedIn ? (
        <p className='text-muted small text-end mt-2 mb-0'>
          <a href='/auth/sign-in'>Zaloguj się</a>, aby zapisywać rachunki i dane
          stron.
        </p>
      ) : null}
      {saveMessage ? (
        <Alert className='mt-3' variant={saveMessage.variant}>
          {saveMessage.text}
        </Alert>
      ) : null}
      {validationErrors.length > 0 ? (
        <Alert className='mt-3' variant='warning'>
          <strong>Aby pobrać PDF, popraw:</strong>
          <ul className='mb-0'>
            {validationErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
      {pdfError ? (
        <Alert className='mt-3' variant='danger' role='alert'>
          Nie udało się wygenerować PDF: {pdfError}
        </Alert>
      ) : null}
    </>
  );
}

function BankConfirmation({ controller }: { controller: GeneratorController }) {
  const {
    showBankConfirmation,
    setShowBankConfirmation,
    userBankAccount,
    formData,
    saveCurrentInvoice,
  } = controller;
  return (
    <Modal
      show={showBankConfirmation}
      onHide={() => {
        setShowBankConfirmation(false);
      }}
      aria-labelledby='bank-confirmation-title'
    >
      <Modal.Header closeButton>
        <Modal.Title id='bank-confirmation-title'>
          {userBankAccount
            ? 'Zmienić rachunek bankowy w profilu?'
            : 'Zapisać rachunek bankowy w profilu?'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          Dane rachunku do wypłaty różnią się od danych zapisanych w profilu.
          Czy zapisać je także w profilu?
        </p>
        {userBankAccount ? (
          <p>
            W profilu: {userBankAccount.accountHolder},{' '}
            {userBankAccount.bankName},{' '}
            {formatPolishBankAccount(userBankAccount.accountNumber)}
          </p>
        ) : (
          <p>W profilu nie zapisano jeszcze rachunku bankowego.</p>
        )}
        <p className='mb-0'>
          Na rachunku: {formData.bankAccountHolder}, {formData.bankName},{' '}
          {formatPolishBankAccount(formData.bankAccountNumber ?? '')}
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant='secondary'
          onClick={() => {
            setShowBankConfirmation(false);
          }}
        >
          Anuluj
        </Button>
        <Button
          variant='outline-primary'
          onClick={() => void saveCurrentInvoice(false)}
        >
          Zapisz tylko rachunek
        </Button>
        <Button variant='primary' onClick={() => void saveCurrentInvoice(true)}>
          {userBankAccount
            ? 'Zapisz i zmień profil'
            : 'Zapisz i dodaj konto w profilu'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function ClearDraftConfirmation({
  controller,
}: {
  controller: GeneratorController;
}) {
  const {
    showClearDraftConfirmation,
    setShowClearDraftConfirmation,
    draftState,
  } = controller;
  return (
    <Modal
      show={showClearDraftConfirmation}
      onHide={() => {
        setShowClearDraftConfirmation(false);
      }}
      aria-labelledby='clear-draft-title'
    >
      <Modal.Header closeButton>
        <Modal.Title id='clear-draft-title'>Usunąć wersję roboczą?</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        Wersja robocza zostanie usunięta z pamięci tej karty. Niezapisanych
        zmian nie będzie można odtworzyć po odświeżeniu.
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant='secondary'
          onClick={() => {
            setShowClearDraftConfirmation(false);
          }}
        >
          Anuluj
        </Button>
        <Button
          variant='danger'
          onClick={() => {
            draftState.clearDraft();
            setShowClearDraftConfirmation(false);
          }}
        >
          Usuń wersję roboczą
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
