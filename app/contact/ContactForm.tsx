'use client';

import { useActionState, useState } from 'react';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import {
  BsCheckCircleFill,
  BsExclamationTriangleFill,
  BsSendFill,
} from 'react-icons/bs';
import { submitContactForm } from './actions';

interface ContactFormProps {
  defaultName?: string;
  defaultEmail?: string;
}

const CATEGORY_OPTIONS = [
  { value: 'Pytanie ogólne', label: 'Pytanie ogólne o aplikację' },
  {
    value: 'Zgłoszenie błędu / wyliczenia',
    label: 'Zgłoszenie błędu lub uwagi do kalkulatora',
  },
  { value: 'Sugestia funkcji', label: 'Sugestia nowej funkcjonalności' },
  { value: 'Współpraca / inne', label: 'Współpraca lub inne zapytanie' },
];

export default function ContactForm({
  defaultName = '',
  defaultEmail = '',
}: ContactFormProps) {
  const [state, formAction, isPending] = useActionState(
    submitContactForm,
    null,
  );
  const [selectedCategory, setSelectedCategory] = useState(
    CATEGORY_OPTIONS[0].value,
  );
  const [resetKey, setResetKey] = useState(0);

  if (state?.ok) {
    return (
      <div className='py-4 text-center'>
        <div className='mb-3 text-success d-inline-flex p-3 rounded-circle bg-success-subtle'>
          <BsCheckCircleFill size={40} />
        </div>
        <h3 className='h4 fw-bold mb-2 text-body-emphasis'>
          Wiadomość wysłana!
        </h3>
        <p
          className='text-body-secondary mb-4 mx-auto'
          style={{ maxWidth: 500 }}
        >
          {state.message}
        </p>
        <Button
          variant='outline-primary'
          onClick={() => setResetKey((k) => k + 1)}
          className='rounded-pill px-4'
        >
          Napisz kolejną wiadomość
        </Button>
      </div>
    );
  }

  return (
    <Form action={formAction} key={resetKey} noValidate={false}>
      <p className='small text-body-secondary'>
        Formularz jest chroniony przez Vercel BotID przed automatycznym spamem.
        Weryfikacja wymaga JavaScript i działa niezależnie od zgody na
        opcjonalną analitykę.
      </p>
      {/* Pole antyspamowe (honeypot) ukryte przed użytkownikami */}
      <div style={{ display: 'none' }} aria-hidden='true' tabIndex={-1}>
        <label htmlFor='hp_website'>Nie wypełniaj tego pola:</label>
        <input
          type='text'
          id='hp_website'
          name='hp_website'
          autoComplete='off'
          tabIndex={-1}
        />
      </div>

      {state && !state.ok && (
        <Alert
          variant='danger'
          className='d-flex align-items-center gap-2 mb-4 py-2 px-3 small'
        >
          <BsExclamationTriangleFill className='flex-shrink-0' />
          <div>{state.message}</div>
        </Alert>
      )}

      <div className='row g-3 mb-3'>
        <div className='col-md-6'>
          <Form.Group controlId='contact-name'>
            <Form.Label className='small fw-bold text-body-secondary'>
              Twoje imię i nazwisko <span className='text-danger'>*</span>
            </Form.Label>
            <Form.Control
              type='text'
              name='name'
              defaultValue={defaultName}
              placeholder='np. Jan Kowalski'
              required
              minLength={2}
              maxLength={100}
              autoComplete='name'
            />
          </Form.Group>
        </div>

        <div className='col-md-6'>
          <Form.Group controlId='contact-email'>
            <Form.Label className='small fw-bold text-body-secondary'>
              Adres e-mail <span className='text-danger'>*</span>
            </Form.Label>
            <Form.Control
              type='email'
              name='email'
              defaultValue={defaultEmail}
              placeholder='np. jan@example.com'
              required
              maxLength={150}
              autoComplete='email'
            />
          </Form.Group>
        </div>
      </div>

      <div className='mb-3'>
        <Form.Group controlId='contact-category'>
          <Form.Label className='small fw-bold text-body-secondary'>
            Kategoria zgłoszenia
          </Form.Label>
          <Form.Select
            name='category'
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      </div>

      <div className='mb-3'>
        <Form.Group controlId='contact-subject'>
          <Form.Label className='small fw-bold text-body-secondary'>
            Temat wiadomości (opcjonalnie)
          </Form.Label>
          <Form.Control
            type='text'
            name='subject'
            placeholder={`np. ${selectedCategory}`}
            maxLength={200}
          />
        </Form.Group>
      </div>

      <div className='mb-4'>
        <Form.Group controlId='contact-message'>
          <Form.Label className='small fw-bold text-body-secondary'>
            Treść wiadomości <span className='text-danger'>*</span>
          </Form.Label>
          <Form.Control
            as='textarea'
            rows={5}
            name='message'
            placeholder='Opisz dokładnie swoje pytanie, problem lub propozycję…'
            required
            minLength={10}
            maxLength={5000}
          />
          <Form.Text className='text-body-secondary'>
            Minimum 10 znaków. Im dokładniejszy opis, tym szybciej będziemy w
            stanie pomóc.
          </Form.Text>
        </Form.Group>
      </div>

      <div className='d-flex align-items-center justify-content-between flex-wrap gap-3'>
        <Button
          type='submit'
          variant='primary'
          disabled={isPending}
          className='d-inline-flex align-items-center gap-2 rounded-pill px-4 py-2 fw-semibold shadow-sm'
        >
          {isPending ? (
            <>
              <Spinner animation='border' size='sm' />
              <span>Wysyłanie wiadomości…</span>
            </>
          ) : (
            <>
              <BsSendFill />
              <span>Wyślij wiadomość</span>
            </>
          )}
        </Button>

        <span className='small text-body-secondary'>
          Odpowiadamy zazwyczaj w ciągu 24–48 godzin.
        </span>
      </div>
    </Form>
  );
}
