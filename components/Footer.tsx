import Link from 'next/link';
import { Container } from 'react-bootstrap';
import type { IconType } from 'react-icons';

function getYear(): number | string {
  const startYear = 2026;
  const currentYear = new Date().getFullYear();

  return startYear === currentYear
    ? startYear
    : `${startYear} - ${currentYear}`;
}

const links: {
  href: string;
  label: string;
  target?: string;
  rel?: string;
}[] = [
  {
    href: '/privacy',
    label: 'Polityka prywatności',
  },
  {
    href: 'https://github.com/reisene/invoice-creator',
    label: 'Repozytorium',
    target: '_blank',
    rel: 'noopener noreferrer',
  },
];

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
      <Container className={'d-flex flex-column gap-2 border-top py-3'}>
        <p className='text-muted small mb-0'>
          Darmowe narzędzie online. Nie zastępuje porady księgowej ani prawnej.
        </p>

        <div
          className={
            'd-flex justify-content-center align-items-center gap-2 flex-wrap'
          }
        >
          <span className={'small'}> Copyright &copy; {getYear()}</span>

          <Link
            href={author.url}
            target={'_blank'}
            rel={'noopener noreferrer'}
            className={'text-decoration-none text-reset fw-bold small'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <Icon aria-hidden={true} size={16} />
            {author.name}
          </Link>

          <span className='d-none d-sm-inline' aria-hidden='true'>
            |
          </span>

          <div className='d-inline-flex gap-2 small'>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                target={link.target}
                rel={link.rel}
                className='text-decoration-none text-reset'
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </footer>
  );
}
