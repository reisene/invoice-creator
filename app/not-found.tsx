import { Button, Container } from 'react-bootstrap';

export default function NotFound() {
  return (
    <Container className='py-4 page-medium'>
      <h1 className='h3 mb-3'>Nie znaleziono strony</h1>
      <p className='text-body-secondary'>
        Strona, której szukasz, nie istnieje lub została przeniesiona.
      </p>
      <Button href='/' variant='outline-primary'>
        Wróć na stronę główną
      </Button>
    </Container>
  );
}
