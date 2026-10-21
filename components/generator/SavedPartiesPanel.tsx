'use client';

import { saveParty } from '@/app/actions/savedData';
import type { InvoiceFormData } from '@/types/invoiceForm';
import type { SavedPartyDto } from '@/types/savedData';
import Link from 'next/link';
import { useState } from 'react';
import { Alert, Button, Col, Form, Row } from 'react-bootstrap';
import { BsQuestionCircle } from 'react-icons/bs';

interface SavedPartiesPanelProps {
  parties: SavedPartyDto[];
  data: InvoiceFormData;
  onChange: (data: InvoiceFormData) => void;
  onSaved: (party: SavedPartyDto) => void;
}

export default function SavedPartiesPanel({
  parties,
  data,
  onChange,
  onSaved,
}: SavedPartiesPanelProps) {
  const [message, setMessage] = useState<{
    variant: 'success' | 'danger';
    text: string;
  } | null>(null);
  const [pending, setPending] = useState(false);

  const clients = parties.filter((p) => p.kind === 'CLIENT');
  const contractors = parties.filter((p) => p.kind === 'CONTRACTOR');

  const applyParty = (id: string) => {
    const party = parties.find((p) => p.id === id);
    if (!party) return;

    if (party.kind === 'CLIENT') {
      onChange({
        ...data,
        clientType: party.clientType ?? 'company',
        clientName: party.name,
        clientAddress: party.address,
        clientNip: party.nip ?? undefined,
        clientPesel: party.pesel ?? undefined,
      });
    } else {
      onChange({
        ...data,
        contractorName: party.name,
        contractorAddress: party.address,
        contractorPesel: party.pesel ?? '',
        contractorNip: party.nip ?? undefined,
      });
    }
  };

  const save = async (kind: 'CLIENT' | 'CONTRACTOR') => {
    setPending(true);
    setMessage(null);
    const isClient = kind === 'CLIENT';
    const result = await saveParty({
      kind,
      clientType: isClient ? data.clientType : undefined,
      name: isClient ? data.clientName : data.contractorName,
      address: isClient ? data.clientAddress : data.contractorAddress,
      nip: isClient ? data.clientNip : data.contractorNip,
      pesel: isClient ? data.clientPesel : data.contractorPesel,
    });
    setPending(false);

    if (!result.ok) {
      setMessage({ variant: 'danger', text: result.error });
      return;
    }

    onSaved({
      id: result.data.id,
      kind,
      label: isClient ? data.clientName : data.contractorName,
      clientType: isClient ? data.clientType : null,
      name: isClient ? data.clientName : data.contractorName,
      address: isClient ? data.clientAddress : data.contractorAddress,
      nip: (isClient ? data.clientNip : data.contractorNip) || null,
      pesel: (isClient ? data.clientPesel : data.contractorPesel) || null,
    });
    setMessage({ variant: 'success', text: 'Zapisano dane.' });
  };

  const renderColumn = (
    kind: 'CLIENT' | 'CONTRACTOR',
    title: string,
    list: SavedPartyDto[],
  ) => (
    <Col md={6}>
      <Form.Group>
        <Form.Label>{title}</Form.Label>
        <Form.Select
          value=''
          onChange={(e) => {
            applyParty(e.target.value);
          }}
          disabled={list.length === 0}
        >
          <option value=''>
            {list.length === 0 ? 'Brak zapisanych' : 'Wybierz zapisane…'}
          </option>
          {list.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </Form.Select>
        <Button
          className='mt-2 px-0'
          variant='link'
          size='sm'
          disabled={pending}
          onClick={() => save(kind)}
        >
          Zapisz bieżące dane
        </Button>
      </Form.Group>
    </Col>
  );

  return (
    <div className='mb-4'>
      <div className='d-flex align-items-center justify-content-between mb-2'>
        <span className='fw-bold small text-body-secondary text-uppercase letter-spacing-1'>
          Zapisane strony umowy
        </span>
        <Link
          href='/help/aplikacja/zapisywanie-danych-i-historia-rachunkow'
          target='_blank'
          rel='noopener noreferrer'
          className='text-primary text-decoration-none small d-inline-flex align-items-center gap-1'
          title='Pomoc: Zarządzanie stronami i kontem'
        >
          <BsQuestionCircle className='small' />
          <span style={{ fontSize: '0.8rem' }}>
            Jak działa baza kontrahentów?
          </span>
        </Link>
      </div>
      <Row className='mb-2'>
        {renderColumn('CLIENT', 'Zapisani zleceniodawcy', clients)}
        {renderColumn('CONTRACTOR', 'Zapisani zleceniobiorcy', contractors)}
      </Row>
      {message ? (
        <Alert className='py-2 mb-0' variant={message.variant}>
          {message.text}
        </Alert>
      ) : null}
    </div>
  );
}
