'use client';

import { acceptCurrentTerms } from '@/app/terms/accept/actions';
import Link from 'next/link';
import { useActionState } from 'react';
import { Alert, Button, Form } from 'react-bootstrap';

export default function AcceptanceForm({
  termsVersion,
}: {
  termsVersion: string;
}) {
  const [state, formAction, isPending] = useActionState(
    acceptCurrentTerms,
    null,
  );

  return (
    <Form action={formAction}>
      <Form.Control type='hidden' name='termsVersion' value={termsVersion} />

      <Form.Check
        className='mb-3'
        id='accept-current-terms'
        name='acceptTerms'
        type='checkbox'
        value='accepted'
        required
        label={
          <>
            Akceptuję{' '}
            <Link href='/terms' target='_blank' rel='noreferrer'>
              aktualny Regulamin
            </Link>
            .
          </>
        }
      />

      {state?.error && <Alert variant='danger'>{state.error}</Alert>}

      <Button type='submit' disabled={isPending} className='w-100'>
        {isPending ? 'Zapisywanie...' : 'Akceptuję i kontynuuję'}
      </Button>
    </Form>
  );
}
