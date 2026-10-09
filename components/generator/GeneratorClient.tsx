'use client';

import InvoiceForm from '@/components/generator/InvoiceForm';
import InvoicePreview from '@/components/generator/InvoicePreview';
import { calculateInvoice } from '@/lib/calculateInvoice';
import type { InvoiceData } from '@/types/invoice';
import type { InvoiceFormData } from '@/types/invoiceForm';
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

    taxReduction: true,
    taxReductionAmount: 300,
  };
}

interface GeneratorClientProps {
  taxParams: TaxParams[];
}

export default function GeneratorClient({ taxParams }: GeneratorClientProps) {
  const [formData, setFormData] = useState<InvoiceFormData>(getInitialData());
  const taxYear = Number(formData.periodStart.slice(0, 4));
  const selectedTaxParams = [...taxParams]
    .reverse()
    .find((params) => params.year <= taxYear);

  const invoiceData: InvoiceData | null = useMemo(
    () =>
      selectedTaxParams ? calculateInvoice(formData, selectedTaxParams) : null,
    [formData, selectedTaxParams],
  );

  const handleDownloadPdf = () => {
    alert('PDF będzie generowany w kolejnym kroku.');
  };

  return (
    <Container className='py-4'>
      <h1 className='mb-4'>Generator rachunku do umowy zlecenia</h1>

      <Row className='g-4'>
        <Col lg={6}>
          <InvoiceForm data={formData} onChange={setFormData} />
        </Col>

        <Col lg={6}>
          {invoiceData ? (
            <>
              <InvoicePreview data={invoiceData} />
              <div className='mt-3 text-end'>
                <Button variant='primary' onClick={handleDownloadPdf}>
                  Pobierz PDF
                </Button>
              </div>
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
