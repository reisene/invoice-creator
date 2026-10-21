import type { Metadata } from 'next';
import { Button, Container } from 'react-bootstrap';
import { BsFileEarmarkText, BsHouse } from 'react-icons/bs';

export const metadata: Metadata = {
  title: 'Nie znaleziono strony',
};

export default function NotFound() {
  return (
    <Container className='py-5 page-medium text-center'>
      <p className='display-1 fw-bold text-body-secondary mb-2'>404</p>
      <h1 className='h3 mb-3'>Nie znaleziono strony</h1>
      <p className='text-body-secondary mb-4'>
        Strona, której szukasz, nie istnieje lub została przeniesiona. Sprawdź
        adres albo wróć do generatora.
      </p>
      <div className='d-flex flex-wrap justify-content-center gap-2'>
        <Button
          href='/'
          variant='primary'
          className='d-inline-flex align-items-center gap-2'
        >
          <BsHouse aria-hidden />
          Strona główna
        </Button>
        <Button
          href='/generator'
          variant='outline-secondary'
          className='d-inline-flex align-items-center gap-2'
        >
          <BsFileEarmarkText aria-hidden />
          Generator rachunku
        </Button>
      </div>
    </Container>
  );
}
