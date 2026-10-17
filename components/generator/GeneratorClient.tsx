'use client';

import {
  getYearToDateInvoiceTaxableIncome,
  reserveInvoiceNumber,
  saveInvoice,
} from '@/app/actions/savedData';
import InvoiceForm from '@/components/generator/InvoiceForm';
import InvoicePreview from '@/components/generator/InvoicePreview';
import SavedPartiesPanel from '@/components/generator/SavedPartiesPanel';
import {
  cleanPolishBankAccount,
  formatPolishBankAccount,
} from '@/lib/invoice/bankUtils';
import { calculateInvoice } from '@/lib/invoice/calculateInvoice';
import { validateInvoiceForm } from '@/lib/invoice/validateInvoiceForm';
import type { InvoiceData } from '@/types/invoice';
import type { InvoiceFormData } from '@/types/invoiceForm';
import type {
  InvoiceNumberReservation,
  SavedPartyDto,
  UserBankAccountDto,
} from '@/types/savedData';
import type { TaxParams } from '@/types/taxParams';
import * as Sentry from '@sentry/nextjs';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Col, Container, Row } from 'react-bootstrap';

function getInitialData(
  savedBankAccount?: UserBankAccountDto | null,
): InvoiceFormData {
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthEnd = new Date();
  monthEnd.setMonth(monthEnd.getMonth() + 1, 0);

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
    periodStart: monthStart.toISOString().slice(0, 10),
    periodEnd: monthEnd.toISOString().slice(0, 10),
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
  initialParties: SavedPartyDto[];
  bankAccount: UserBankAccountDto | null;
  initialInvoice?: {
    id: string;
    invoiceNumber: string;
    data: InvoiceFormData;
  };
  duplicateData?: InvoiceFormData;
}

export default function GeneratorClient({
  taxParams,
  signedIn,
  initialParties,
  bankAccount,
  initialInvoice,
  duplicateData,
}: GeneratorClientProps) {
  const [userBankAccount, setUserBankAccount] =
    useState<UserBankAccountDto | null>(bankAccount);
  const [formData, setFormData] = useState<InvoiceFormData>(() => {
    if (initialInvoice) return initialInvoice.data;
    if (duplicateData) {
      return {
        ...duplicateData,
        issueDate: getInitialData(bankAccount).issueDate,
      };
    }
    return getInitialData(bankAccount);
  });
  const [parties, setParties] = useState(initialParties);
  const [invoiceId, setInvoiceId] = useState(initialInvoice?.id);
  const [invoiceNumber, setInvoiceNumber] = useState(
    initialInvoice?.invoiceNumber,
  );
  const [numberReservation, setNumberReservation] =
    useState<InvoiceNumberReservation>();
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    variant: 'success' | 'danger';
    text: string;
  } | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [savedInvoiceTaxableIncome, setSavedInvoiceTaxableIncome] = useState(0);
  const [isLoadingSavedIncome, setIsLoadingSavedIncome] = useState(signedIn);
  const [savedIncomeError, setSavedIncomeError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialInvoice && !duplicateData) {
      try {
        const stored = sessionStorage.getItem('generator_preset_data');
        if (stored) {
          const parsed = JSON.parse(stored) as InvoiceFormData;
          if (parsed && typeof parsed === 'object') {
            setFormData({
              ...getInitialData(bankAccount),
              ...parsed,
              issueDate:
                parsed.issueDate ?? getInitialData(bankAccount).issueDate,
            });
            sessionStorage.removeItem('generator_preset_data');
          }
        }
      } catch {
        // Ignoruj błąd odczytu z pamięci podręcznej
      }
    }
  }, [initialInvoice, duplicateData, bankAccount]);

  const taxYear = Number(formData.periodStart.slice(0, 4));

  useEffect(() => {
    if (!signedIn) {
      setIsLoadingSavedIncome(false);
      return;
    }

    let active = true;
    setIsLoadingSavedIncome(true);
    setSavedIncomeError(null);

    void getYearToDateInvoiceTaxableIncome(taxYear, invoiceId)
      .then((result) => {
        if (!active) return;
        if (!result.ok) {
          setSavedIncomeError(result.error);
          return;
        }
        setSavedInvoiceTaxableIncome(result.data);
      })
      .catch((error: unknown) => {
        Sentry.withScope((scope) => {
          scope.setTag('error.area', 'generator.invoice.annual-income');
          Sentry.captureException(error);
        });
        if (active) {
          setSavedIncomeError(
            'Nie udało się zsumować zapisanych rachunków. Odśwież stronę i spróbuj ponownie.',
          );
        }
      })
      .finally(() => {
        if (active) setIsLoadingSavedIncome(false);
      });

    return () => {
      active = false;
    };
  }, [signedIn, taxYear, invoiceId]);
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

  const handleSave = async () => {
    if (isSaving || validationErrors.length > 0) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const result = await saveInvoice(
        formData,
        invoiceId,
        numberReservation,
        true,
      );
      if (result.ok) {
        setInvoiceId(result.data.id);
        setInvoiceNumber(result.data.invoiceNumber);
        setNumberReservation(undefined);
        if (
          formData.paymentMethod === 'TRANSFER' &&
          formData.transferTarget === 'SAVED_ACCOUNT' &&
          formData.bankAccountNumber &&
          formData.bankName &&
          formData.bankAccountHolder
        ) {
          setUserBankAccount({
            accountHolder: formData.bankAccountHolder.trim(),
            bankName: formData.bankName.trim(),
            accountNumber: cleanPolishBankAccount(formData.bankAccountNumber),
          });
        }
        setSaveMessage({ variant: 'success', text: 'Rachunek zapisany.' });
      } else {
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

  const handleDownloadPdf = async () => {
    if (!invoiceData || isGeneratingPdf || validationErrors.length > 0) return;

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
        setInvoiceNumber(number);
        setNumberReservation(result.data);
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
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
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

  return (
    <Container className='py-4'>
      <h1 className='mb-4'>Generator rachunku do umowy zlecenia</h1>

      <Row className='g-4'>
        <Col lg={6}>
          {signedIn ? (
            <SavedPartiesPanel
              parties={parties}
              data={formData}
              onChange={setFormData}
              onSaved={(party) => setParties((prev) => [...prev, party])}
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
        </Col>

        <Col lg={6}>
          {invoiceData && selectedTaxParams ? (
            <div className='preview-sticky-wrapper'>
              <InvoicePreview
                data={invoiceData}
                taxParams={selectedTaxParams}
                invoiceNumber={invoiceNumber}
              />
              <div className='mt-3 d-flex justify-content-end gap-2'>
                {signedIn ? (
                  <Button
                    variant='outline-primary'
                    onClick={handleSave}
                    disabled={
                      isSaving ||
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
                    (signedIn &&
                      (isLoadingSavedIncome || savedIncomeError !== null)) ||
                    validationErrors.length > 0
                  }
                >
                  {isGeneratingPdf ? 'Generowanie PDF…' : 'Pobierz PDF'}
                </Button>
              </div>
              {!signedIn ? (
                <p className='text-muted small text-end mt-2 mb-0'>
                  <a href='/auth/sign-in'>Zaloguj się</a>, aby zapisywać
                  rachunki i dane stron.
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
            </div>
          ) : (
            <Alert variant='danger'>
              Brak parametrów podatkowych dla roku {taxYear}. Nie można obliczyć
              rachunku.
            </Alert>
          )}
        </Col>
      </Row>
    </Container>
  );
}
