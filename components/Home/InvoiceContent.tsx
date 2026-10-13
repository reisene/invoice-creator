import Link from 'next/link';
import {
  Badge,
  Card,
  CardBody,
  Col,
  ListGroup,
  ListGroupItem,
  Row,
} from 'react-bootstrap';
import {
  BsArrowRight,
  BsCheckCircleFill,
  BsFileEarmarkTextFill,
  BsInfoCircleFill,
} from 'react-icons/bs';

const requiredElements: { title: string; desc: string }[] = [
  {
    title: 'Dane stron umowy',
    desc: 'Pełna nazwa/imię, adres oraz identyfikator NIP lub PESEL zleceniodawcy i zleceniobiorcy.',
  },
  {
    title: 'Identyfikator umowy i okres',
    desc: 'Numer i data zawarcia umowy zlecenia oraz precyzyjny okres rozliczeniowy.',
  },
  {
    title: 'Szczegółowe zestawienie finansowe',
    desc: 'Kwota brutto, składki ZUS (emerytalna, rentowa, chorobowa, zdrowotna), koszty uzyskania przychodu oraz zaliczka PIT.',
  },
  {
    title: 'Kwota netto do wypłaty',
    desc: 'Ostateczna kwota wypłaty wyrażona liczbowo i słownie, aby uniknąć pomyłek.',
  },
  {
    title: 'Forma i termin płatności',
    desc: 'Wskazanie przelewu bankowego z numerem rachunku IBAN lub wypłaty gotówkowej.',
  },
  {
    title: 'Data, miejsce i podpisy',
    desc: 'Miejsca na podpisy zleceniodawcy i zleceniobiorcy potwierdzające wykonanie i odbiór zlecenia.',
  },
];

export default function InvoiceContent() {
  return (
    <section className='py-4 py-lg-5'>
      <Row className='justify-content-center mb-4 text-center'>
        <Col lg={8}>
          <div className='mb-2'>
            <Badge
              bg='primary-subtle'
              className='text-primary border border-primary-subtle px-3 py-2 rounded-pill fw-medium'
            >
              Standard formalno-prawny
            </Badge>
          </div>
          <h2 className='display-6 fw-bold text-body-emphasis'>
            Co musi zawierać poprawny rachunek?
          </h2>
          <p className='lead text-body-secondary mt-2 mb-0'>
            Rachunek do umowy zlecenia to dowód księgowy potwierdzający
            wykonanie usługi i stanowiący podstawę do wypłaty wynagrodzenia.
          </p>
        </Col>
      </Row>

      <Row className='g-4 align-items-stretch'>
        <Col lg={7}>
          <Card className='h-100 border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 p-3 p-sm-4'>
            <h3 className='h5 fw-bold mb-3 text-body-emphasis d-flex align-items-center gap-2'>
              <BsFileEarmarkTextFill className='text-primary' />
              <span>Niezbędne elementy na dokumencie</span>
            </h3>
            <ListGroup variant='flush' className='bg-transparent'>
              {requiredElements.map((item, index) => (
                <ListGroupItem
                  key={item.title}
                  className='bg-transparent border-secondary-subtle px-0 py-2 d-flex gap-3 align-items-start'
                >
                  <span
                    className='badge bg-primary-subtle text-primary rounded-circle p-2 d-flex align-items-center justify-content-center flex-shrink-0 mt-1'
                    style={{ width: 24, height: 24 }}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <span className='fw-semibold text-body-emphasis d-block'>
                      {item.title}
                    </span>
                    <span className='small text-body-secondary'>
                      {item.desc}
                    </span>
                  </div>
                </ListGroupItem>
              ))}
            </ListGroup>
          </Card>
        </Col>

        <Col lg={5} className='d-flex flex-column gap-3'>
          <Card className='border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 p-3 p-sm-4 flex-grow-1'>
            <CardBody className='p-0'>
              <div className='d-flex align-items-center gap-2 mb-2'>
                <BsCheckCircleFill className='text-success fs-5 flex-shrink-0' />
                <h4 className='h6 fw-bold mb-0 text-body-emphasis'>
                  Dwa jednobrzmiące egzemplarze
                </h4>
              </div>
              <p className='small text-body-secondary mb-0'>
                Rachunek wystawia się w dwóch egzemplarzach – jeden dla
                zleceniodawcy (jako dowód księgowy do rozliczenia kosztów, ZUS i
                PIT), a drugi dla zleceniobiorcy. Nasz generator automatycznie
                przygotowuje dokument w formacie A4 gotowym do druku w obu
                egzemplarzach.
              </p>
            </CardBody>
          </Card>

          <Card className='border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 p-3 p-sm-4 flex-grow-1'>
            <CardBody className='p-0'>
              <div className='d-flex align-items-center gap-2 mb-2'>
                <BsInfoCircleFill className='text-primary fs-5 flex-shrink-0' />
                <h4 className='h6 fw-bold mb-0 text-body-emphasis'>
                  Rachunek a faktura VAT
                </h4>
              </div>
              <p className='small text-body-secondary mb-0'>
                Osoby fizyczne wykonujące zlecenie poza działalnością
                gospodarczą nie wystawiają faktur VAT, lecz właśnie rachunek do
                umowy zlecenia. Dokument ten jest w 100% honorowany przez Urząd
                Skarbowy oraz Zakład Ubezpieczeń Społecznych.
              </p>
            </CardBody>
          </Card>

          <Link
            href='/preview'
            className='btn btn-outline-secondary rounded-pill py-2 text-center d-flex align-items-center justify-content-center gap-2 fw-medium'
          >
            <span>Zobacz przykładowy wzór rachunku</span>
            <BsArrowRight />
          </Link>
        </Col>
      </Row>
    </section>
  );
}
