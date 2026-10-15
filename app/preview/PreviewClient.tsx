'use client';

import * as Sentry from '@sentry/nextjs';
import InvoicePreview from '@/components/generator/InvoicePreview';
import { calculateInvoice } from '@/lib/calculateInvoice';
import {
  SAMPLE_INVOICE_PRESETS,
  type SampleInvoicePreset,
} from '@/lib/sampleInvoices';
import type { InvoiceData } from '@/types/invoice';
import type { InvoiceFormData } from '@/types/invoiceForm';
import type { TaxParams } from '@/types/taxParams';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Row,
} from 'react-bootstrap';
import {
  BsArrowCounterclockwise,
  BsArrowRight,
  BsDownload,
  BsInfoCircleFill,
} from 'react-icons/bs';

interface PreviewClientProps {
  taxParams: TaxParams[];
}

export default function PreviewClient({ taxParams }: PreviewClientProps) {
  const router = useRouter();
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    SAMPLE_INVOICE_PRESETS[0].id,
  );

  const selectedPreset = useMemo(
    () =>
      SAMPLE_INVOICE_PRESETS.find((preset) => preset.id === selectedPresetId) ??
      SAMPLE_INVOICE_PRESETS[0],
    [selectedPresetId],
  );

  const [formData, setFormData] = useState<InvoiceFormData>(
    selectedPreset.formData,
  );
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const taxYear = Number(formData.periodStart.slice(0, 4));
  const activeTaxParams =
    [...taxParams].reverse().find((p) => p.year <= taxYear) ?? taxParams[0];

  const invoiceData: InvoiceData = useMemo(
    () => calculateInvoice(formData, activeTaxParams),
    [formData, activeTaxParams],
  );

  const handleSelectPreset = (preset: SampleInvoicePreset) => {
    setSelectedPresetId(preset.id);
    setFormData(preset.formData);
  };

  const handleResetToPreset = () => {
    setFormData(selectedPreset.formData);
  };

  const handleOpenInGenerator = () => {
    try {
      sessionStorage.setItem('generator_preset_data', JSON.stringify(formData));
    } catch {
      // Ignoruj błąd zapisu pamięci podręcznej przeglądarki
    }
    router.push('/generator');
  };

  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setPdfError(null);

    try {
      const [{ pdf }, { default: createInvoicePdfDocument }] =
        await Promise.all([
          import('@react-pdf/renderer'),
          import('@/components/generator/InvoicePdfDocument'),
        ]);

      const sampleInvoiceNumber = `WZORZEC/${selectedPreset.id.toUpperCase()}/2026`;
      const blob = await pdf(
        createInvoicePdfDocument(invoiceData, sampleInvoiceNumber),
      ).toBlob();
      const objectUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = objectUrl;
      downloadLink.download = `rachunek-wzorzec-${selectedPreset.id}.pdf`;
      document.body.append(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      Sentry.withScope((scope) => {
        scope.setTag('error.area', 'preview.pdf.generate');
        Sentry.captureException(error);
      });
      setPdfError('Nie udało się wygenerować pliku PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Container className='py-4'>
      <div className='mb-4'>
        <h1 className='h2 mb-2'>Wzory i podgląd rachunków do umowy zlecenia</h1>
        <p className='text-muted mb-0'>
          Wybierz typ rozliczenia, aby zobaczyć kompletny dokument, przetestować
          własne stawki i sprawdzić dokładne wyliczenia podatków i składek ZUS.
        </p>
      </div>

      {/* Wybór wzorców */}
      <Row className='g-2 mb-4'>
        {SAMPLE_INVOICE_PRESETS.map((preset) => {
          const isSelected = preset.id === selectedPresetId;
          return (
            <Col key={preset.id} xs={12} sm={6} lg>
              <Card
                role='button'
                tabIndex={0}
                onClick={() => handleSelectPreset(preset)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectPreset(preset);
                  }
                }}
                className={`h-100 text-decoration-none rounded-3 hover-elevate border ${
                  isSelected
                    ? 'border-primary shadow-sm bg-primary-subtle'
                    : 'border-secondary-subtle bg-body'
                }`}
              >
                <Card.Body className='p-3 d-flex flex-column justify-content-between'>
                  <div>
                    <Badge bg={preset.badgeVariant} className='mb-2'>
                      {preset.badge}
                    </Badge>
                    <h2 className='h6 fw-bold mb-1 text-body-emphasis'>
                      {preset.name}
                    </h2>
                    <p className='small text-muted mb-0'>
                      {preset.shortDescription}
                    </p>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Row className='g-4'>
        {/* Lewa kolumna: Szybka konfiguracja stawek + informacje prawne + akcje */}
        <Col lg={5}>
          {/* Informacja prawna o danym typie zlecenia */}
          <Card className='mb-3 border-info-subtle bg-info-subtle rounded-4 shadow-sm'>
            <Card.Body className='p-3'>
              <div className='d-flex align-items-center gap-2 mb-2'>
                <BsInfoCircleFill className='text-info' size={18} />
                <h3 className='h6 fw-bold mb-0'>Zasady tego rozliczenia</h3>
              </div>
              <p className='small text-body-secondary mb-0'>
                {selectedPreset.legalNote}
              </p>
            </Card.Body>
          </Card>

          {/* Szybka edycja kwot i parametrów */}
          <Card className='mb-3 border-secondary-subtle rounded-4 shadow-sm overflow-hidden'>
            <Card.Header className='bg-body-tertiary d-flex justify-content-between align-items-center'>
              <span className='fw-bold small'>Własne stawki i parametry</span>
              <Button
                variant='link'
                size='sm'
                className='text-decoration-none p-0 small'
                onClick={handleResetToPreset}
              >
                <BsArrowCounterclockwise className='me-1' />
                Domyślne kwoty
              </Button>
            </Card.Header>
            <Card.Body className='p-3'>
              {formData.contractType === 'monthly' ? (
                <Form.Group className='mb-3'>
                  <Form.Label className='small fw-semibold'>
                    Kwota brutto (zł)
                  </Form.Label>
                  <Form.Control
                    type='number'
                    step='0.01'
                    min={0}
                    value={formData.grossAmount ?? ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        grossAmount: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      }))
                    }
                  />
                </Form.Group>
              ) : (
                <Row className='g-2 mb-3'>
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className='small fw-semibold'>
                        Stawka za godzinę (zł)
                      </Form.Label>
                      <Form.Control
                        type='number'
                        step='0.01'
                        min={0}
                        value={formData.hourlyRate ?? ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            hourlyRate: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          }))
                        }
                      />
                    </Form.Group>
                  </Col>
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className='small fw-semibold'>
                        Liczba godzin
                      </Form.Label>
                      <Form.Control
                        type='number'
                        step='any'
                        min={0}
                        value={formData.hoursWorked ?? ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            hoursWorked: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          }))
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>
              )}

              <Row className='g-2 mb-2'>
                <Col sm={6}>
                  <Form.Group>
                    <Form.Label className='small fw-semibold'>
                      Koszty KUP
                    </Form.Label>
                    <Form.Select
                      size='sm'
                      value={formData.costType}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          costType: e.target.value as '20' | '50',
                        }))
                      }
                    >
                      <option value='20'>20% (standardowe)</option>
                      <option value='50'>50% (autorskie)</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col sm={6}>
                  <Form.Group>
                    <Form.Label className='small fw-semibold'>
                      Ulga PIT-2
                    </Form.Label>
                    <Form.Select
                      size='sm'
                      value={
                        formData.taxReduction ? formData.taxReductionAmount : 0
                      }
                      onChange={(e) => {
                        const amount = Number(e.target.value) as
                          0 | 100 | 150 | 300;
                        setFormData((prev) => ({
                          ...prev,
                          taxReduction: amount > 0,
                          taxReductionAmount: amount,
                        }));
                      }}
                    >
                      <option value={300}>300 zł (1 płatnik)</option>
                      <option value={150}>150 zł (2 płatników)</option>
                      <option value={100}>100 zł (3 płatników)</option>
                      <option value={0}>Brak ulgi (0 zł)</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <div className='d-flex flex-column gap-2 mt-3 pt-2 border-top'>
                {formData.contractorStatus === 'standard' && (
                  <Form.Check
                    type='checkbox'
                    id='preview-sickness'
                    label='Dobrowolna składka chorobowa (2,45%)'
                    className='small'
                    checked={formData.voluntarySickness}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        voluntarySickness: e.target.checked,
                      }))
                    }
                  />
                )}
                <Form.Check
                  type='checkbox'
                  id='preview-young'
                  label='Ulga dla młodych (zwolnienie do 26 lat)'
                  className='small'
                  checked={formData.youngRelief}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      youngRelief: e.target.checked,
                    }))
                  }
                />
              </div>
            </Card.Body>
          </Card>

          {/* Przyciski akcji */}
          <div className='d-grid gap-2'>
            <Button
              variant='primary'
              size='lg'
              className='d-flex align-items-center justify-content-center gap-2'
              onClick={handleOpenInGenerator}
            >
              <BsArrowRight size={18} />
              <span>Otwórz w generatorze</span>
            </Button>

            <Button
              variant='outline-secondary'
              className='d-flex align-items-center justify-content-center gap-2'
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
            >
              <BsDownload size={16} />
              <span>
                {isGeneratingPdf
                  ? 'Generowanie pliku PDF…'
                  : 'Pobierz wzorcowy PDF'}
              </span>
            </Button>

            {pdfError && (
              <Alert variant='danger' className='small py-2 mt-2 mb-0'>
                {pdfError}
              </Alert>
            )}
          </div>
        </Col>

        {/* Prawa kolumna: Podgląd rachunku na żywo */}
        <Col lg={7}>
          <div className='preview-sticky-wrapper'>
            <InvoicePreview
              data={invoiceData}
              taxParams={activeTaxParams}
              invoiceNumber={`WZORZEC/${selectedPreset.id.toUpperCase()}/2026`}
            />
          </div>
        </Col>
      </Row>
    </Container>
  );
}
