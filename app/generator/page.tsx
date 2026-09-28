'use client';

import InvoiceForm from '@/components/generator/InvoiceForm';
import InvoicePreview from '@/components/generator/InvoicePreview';
import { calculateInvoice } from '@/lib/calculateInvoice';
import type { InvoiceData } from '@/types/invoice';
import type { InvoiceFormData } from '@/types/invoiceForm';
import { useMemo, useState } from 'react';
import { Button, Col, Container, Row } from 'react-bootstrap';

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

export default function GeneratorPage() {
  const [formData, setFormData] = useState<InvoiceFormData>(getInitialData());

  const invoiceData: InvoiceData = useMemo(
    () => calculateInvoice(formData),
    [formData],
  );

  const handleDownloadPdf = () => {
    // Tu później podpięiesz generowanie PDF z @react-pdf/renderer
    // Na razie placeholder:
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
          <InvoicePreview data={invoiceData} />

          <div className='mt-3 text-end'>
            <Button variant='primary' onClick={handleDownloadPdf}>
              Pobierz PDF
            </Button>
          </div>
        </Col>
      </Row>
    </Container>
  );
}
