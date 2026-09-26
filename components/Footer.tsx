import Link from 'next/link';
import { Container } from 'react-bootstrap';
import { IconType } from 'react-icons';

function getYear(): number | string {
  const startYear = 2026;
  const currentYear: number = new Date().getFullYear();
  return startYear === currentYear
    ? startYear
    : `${startYear} - ${currentYear}`;
}

export default function Footer({
  author,
}: {
  author: {
    name: string;
    url: string;
    ico: IconType;
  };
}) {
  const Icon: IconType = author.ico;
  return (
    <footer className={'mt-auto text-center'}>
      <Container
        className={
          'd-flex justify-content-center align-items-center gap-2 border-top py-3'
        }
      >
        <span>Copyright &copy; {getYear()}</span>
        <Link
          href={author.url}
          target={'_blank'}
          rel={'noopener noreferrer'}
          className={'text-decoration-none text-reset fw-bold'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <Icon aria-hidden={true} size={20} />
          {author.name}
        </Link>
        <span className='d-none d-sm-inline' aria-hidden='true'>
          |
        </span>
        <span>All rights reserved</span>
      </Container>
    </footer>
  );
}
