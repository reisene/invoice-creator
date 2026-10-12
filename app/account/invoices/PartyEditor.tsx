'use client';

import { saveParty, updateParty } from '@/app/actions/savedData';
import type { SavedPartyDto } from '@/types/savedData';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';

export default function PartyEditor({ party }: { party?: SavedPartyDto }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [kind, setKind] = useState<'CLIENT' | 'CONTRACTOR'>(
    party?.kind ?? 'CONTRACTOR',
  );
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = {
      kind,
      clientType: kind === 'CLIENT' ? data.get('clientType') : undefined,
      name: String(data.get('name') ?? ''),
      address: String(data.get('address') ?? ''),
      nip: String(data.get('nip') ?? ''),
      pesel: String(data.get('pesel') ?? ''),
    };

    startTransition(async () => {
      const result = party
        ? await updateParty(party.id, input)
        : await saveParty(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setShow(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        size='sm'
        variant={party ? 'outline-primary' : 'primary'}
        className={party ? 'me-2' : undefined}
        onClick={() => {
          setError('');
          setShow(true);
        }}
      >
        {party ? 'Edytuj' : 'Dodaj'}
      </Button>

      <Modal show={show} onHide={() => setShow(false)}>
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title className='h5'>
              {party ? 'Edytuj dane' : 'Dodaj dane'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className='mb-3'>
              <Form.Label>Rola</Form.Label>
              <Form.Select
                value={kind}
                onChange={(e) =>
                  setKind(e.target.value as 'CLIENT' | 'CONTRACTOR')
                }
              >
                <option value='CONTRACTOR'>Zleceniobiorca</option>
                <option value='CLIENT'>Zleceniodawca</option>
              </Form.Select>
            </Form.Group>
            {kind === 'CLIENT' && (
              <Form.Group className='mb-3'>
                <Form.Label>Typ zleceniodawcy</Form.Label>
                <Form.Select
                  name='clientType'
                  defaultValue={party?.clientType ?? 'company'}
                >
                  <option value='company'>Firma</option>
                  <option value='private'>Osoba prywatna</option>
                </Form.Select>
              </Form.Group>
            )}
            <Form.Group className='mb-3'>
              <Form.Label>Imię i nazwisko / nazwa</Form.Label>
              <Form.Control
                name='name'
                required
                maxLength={200}
                defaultValue={party?.name}
              />
            </Form.Group>
            <Form.Group className='mb-3'>
              <Form.Label>Adres</Form.Label>
              <Form.Control
                name='address'
                required
                maxLength={300}
                defaultValue={party?.address}
              />
            </Form.Group>
            <Form.Group className='mb-3'>
              <Form.Label>NIP (opcjonalnie)</Form.Label>
              <Form.Control
                name='nip'
                maxLength={20}
                defaultValue={party?.nip ?? ''}
              />
            </Form.Group>
            <Form.Group className='mb-3'>
              <Form.Label>PESEL (opcjonalnie)</Form.Label>
              <Form.Control
                name='pesel'
                maxLength={20}
                defaultValue={party?.pesel ?? ''}
              />
            </Form.Group>
            {error && <Alert variant='danger'>{error}</Alert>}
          </Modal.Body>
          <Modal.Footer>
            <Button variant='secondary' onClick={() => setShow(false)}>
              Anuluj
            </Button>
            <Button type='submit' disabled={isPending}>
              {isPending ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
