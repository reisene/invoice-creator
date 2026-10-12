import { Container, Spinner } from 'react-bootstrap';

export default function Loading() {
  return (
    <Container
      className='py-5 d-flex flex-column align-items-center gap-3'
      role='status'
      aria-live='polite'
    >
      <Spinner animation='border' aria-hidden />
      <span className='text-body-secondary'>Ładowanie…</span>
    </Container>
  );
}
