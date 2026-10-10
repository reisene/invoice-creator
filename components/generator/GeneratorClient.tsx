'use client';

import { saveInvoice } from '@/app/actions/savedData';
import InvoiceForm from '@/components/generator/InvoiceForm';
import InvoicePreview from '@/components/generator/InvoicePreview';
import SavedPartiesPanel from '@/components/generator/SavedPartiesPanel';
import { calculateInvoice } from '@/lib/calculateInvoice';
import { validateInvoiceForm } from '@/lib/validateInvoiceForm';
import type { InvoiceData } from '@/types/invoice';
import type { InvoiceFormData } from '@/types/invoiceForm';
import type { SavedPartyDto } from '@/types/savedData';
import type { TaxParams } from '@/types/taxParams';
import { useMemo, useState } from 'react';
import { Alert, Button, Col, Container, Row } from 'react-bootstrap';

function getInitialData(): InvoiceFormData {
  const today = new Date().toISOString().slice(0, 10);
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

    taxReduction: true,
    taxReductionAmount: 300,
  };
}

interface GeneratorClientProps {
  taxParams: TaxParams[];
  signedIn: boolean;
  initialParties: SavedPartyDto[];
  initialInvoice?: { id: string; data: InvoiceFormData };
}

export default function GeneratorClient({
  taxParams,
  signedIn,
  initialParties,
  initialInvoice,
}: GeneratorClientProps) {
  const [formData, setFormData] = useState<InvoiceFormData>(
    initialInvoice?.data ?? getInitialData(),
  );
  const [parties, setParties] = useState(initialParties);
  const [invoiceId, setInvoiceId] = useState(initialInvoice?.id);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    variant: 'success' | 'danger';
    text: string;
  } | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const taxYear = Number(formData.periodStart.slice(0, 4));
  const selectedTaxParams = [...taxParams]
    .reverse()
    .find((params) => params.year <= taxYear);

  const invoiceData: InvoiceData | null = useMemo(
    () =>
      selectedTaxParams ? calculateInvoice(formData, selectedTaxParams) : null,
    [formData, selectedTaxParams],
  );

  const validationErrors = useMemo(
    () => validateInvoiceForm(formData, selectedTaxParams),
    [formData, selectedTaxParams],
  );

  const handleSave = async () => {
    if (isSaving || validationErrors.length > 0) return;
    setIsSaving(true);
    setSaveMessage(null);
    const result = await saveInvoice(formData, invoiceId);
    setIsSaving(false);
    if (result.ok) {
      setInvoiceId(result.data.id);
      setSaveMessage({ variant: 'success', text: 'Rachunek zapisany.' });
    } else {
      setSaveMessage({ variant: 'danger', text: result.error });
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

      const blob = await pdf(createInvoicePdfDocument(invoiceData)).toBlob();
      const objectUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      const filenamePart = (
        invoiceData.contract.number || invoiceData.contract.periodStart
      ).replace(/[^a-zA-Z0-9_-]/g, '_');

      downloadLink.href = objectUrl;
      downloadLink.download = `rachunek-${filenamePart}.pdf`;
      document.body.append(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error: unknown) {
      setPdfError(
        error instanceof Error
          ? error.message
          : 'Nie udało się wygenerować pliku PDF.',
      );
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
          />
        </Col>

        <Col lg={6}>
          {invoiceData && selectedTaxParams ? (
            <>
              <InvoicePreview
                data={invoiceData}
                taxParams={selectedTaxParams}
              />
              <div className='mt-3 d-flex justify-content-end gap-2'>
                {signedIn ? (
                  <Button
                    variant='outline-primary'
                    onClick={handleSave}
                    disabled={isSaving || validationErrors.length > 0}
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
                  disabled={isGeneratingPdf || validationErrors.length > 0}
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
            </>
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
