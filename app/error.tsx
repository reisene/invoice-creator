'use client';

import { Alert, Button, Container } from 'react-bootstrap';

export default function Error({ retry }: { retry: () => void }) {
  return (
    <Container className='py-4 page-medium'>
      <Alert variant='danger'>
        <Alert.Heading as='h1' className='h5'>
          Coś poszło nie tak
        </Alert.Heading>
        <p className='mb-0'>
          Wystąpił nieoczekiwany błąd. Spróbuj ponownie lub wróć za chwilę.
        </p>
      </Alert>
      <Button variant='outline-primary' onClick={() => retry()}>
        Spróbuj ponownie
      </Button>
    </Container>
  );
}
