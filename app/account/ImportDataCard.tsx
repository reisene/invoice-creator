'use client';

import * as Sentry from '@sentry/nextjs';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { Alert, Button, Card, Form } from 'react-bootstrap';
import { type ImportSummary, importUserData } from './importActions';

const BANK_LABEL: Record<ImportSummary['bankAccount'], string> = {
  add: 'zostanie dodany',
  exists: 'pominięty (masz już zapisany rachunek)',
  none: 'brak w pliku',
  invalid: 'pominięty (nieprawidłowe dane)',
};

export function ImportDataCard() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [raw, setRaw] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportSummary | null>(null);
  const [done, setDone] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setRaw(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleFile(file: File | undefined) {
    setError(null);
    setDone(null);
    setPreview(null);
    setRaw(null);
    if (!file) return;
    if (file.size > 5_000_000) {
      setError('Plik jest zbyt duży (maks. ok. 5 MB).');
      return;
    }
    startTransition(async () => {
      try {
        const text = await file.text();
        const result = await importUserData(text, false);
        if (result.ok) {
          setRaw(text);
          setPreview(result.data);
        } else {
          setError(result.error);
        }
      } catch (error) {
        Sentry.withScope((scope) => {
          scope.setTag('error.area', 'account.import.preview');
          Sentry.captureException(error);
        });
        setError(
          'Nie udało się odczytać lub sprawdzić pliku. Wybierz go ponownie i spróbuj jeszcze raz.',
        );
      }
    });
  }

  function handleConfirm() {
    if (!raw) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await importUserData(raw, true);
        if (result.ok) {
          setDone(result.data);
          reset();
          router.refresh();
        } else {
          setError(result.error);
        }
      } catch (error) {
        Sentry.withScope((scope) => {
          scope.setTag('error.area', 'account.import.commit');
          Sentry.captureException(error);
        });
        setError('Wystąpił błąd. Spróbuj ponownie.');
      }
    });
  }

  const nothingToAdd =
    preview &&
    preview.invoices.add === 0 &&
    preview.parties.add === 0 &&
    preview.bankAccount !== 'add';

  return (
    <Card
      body
      className='border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 mb-4'
    >
      <h3 className='h5 mb-2'>Import danych</h3>
      <p className='text-body-secondary small'>
        Wczytaj plik JSON wyeksportowany wcześniej z tej aplikacji. Najpierw
        zobaczysz podgląd zmian. Istniejące dane nie są nadpisywane ani usuwane,
        duplikaty są pomijane.
      </p>
      <Form.Group controlId='account-import-file'>
        <Form.Label>Plik eksportu danych (JSON, maks. 5 MB)</Form.Label>
        <Form.Control
          ref={inputRef}
          type='file'
          accept='application/json,.json'
          disabled={pending}
          onChange={(e) =>
            handleFile((e.target as HTMLInputElement).files?.[0])
          }
        />
      </Form.Group>

      {error && (
        <Alert className='mt-3 mb-0' variant='danger' role='alert'>
          {error}
        </Alert>
      )}

      {preview && (
        <Alert className='mt-3 mb-0' variant='info'>
          <strong>Podgląd importu</strong>
          <ul className='mb-2 mt-2'>
            <li>
              Rachunki: do dodania {preview.invoices.add}, duplikaty{' '}
              {preview.invoices.duplicates}, nieprawidłowe{' '}
              {preview.invoices.invalid}
            </li>
            <li>
              Strony: do dodania {preview.parties.add}, duplikaty{' '}
              {preview.parties.duplicates}, nieprawidłowe{' '}
              {preview.parties.invalid}
            </li>
            <li>Rachunek bankowy: {BANK_LABEL[preview.bankAccount]}</li>
          </ul>
          {preview.problems.length > 0 && (
            <ul className='small text-danger'>
              {preview.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          )}
          <div className='d-flex gap-2'>
            <Button
              size='sm'
              disabled={pending || !!nothingToAdd}
              onClick={handleConfirm}
            >
              {pending ? 'Importowanie…' : 'Zaimportuj'}
            </Button>
            <Button
              size='sm'
              variant='outline-secondary'
              disabled={pending}
              onClick={reset}
            >
              Anuluj
            </Button>
          </div>
        </Alert>
      )}

      {done && (
        <Alert className='mt-3 mb-0' variant='success' role='status'>
          Zaimportowano: rachunki {done.invoices.add}, strony {done.parties.add}
          {done.bankAccount === 'add' ? ', rachunek bankowy' : ''}.
        </Alert>
      )}
    </Card>
  );
}
