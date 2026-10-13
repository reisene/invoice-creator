import { getSiteDisplayUrl } from '@/lib/siteUrl';
import { numberToWords } from '@/lib/toWords';
import type { InvoiceData } from '@/types/invoice';
import type { TaxParams } from '@/types/taxParams';
import { Col, Row, Table } from 'react-bootstrap';

interface InvoicePreviewProps {
  data: InvoiceData;
  taxParams: TaxParams;
  invoiceNumber?: string;
}

function formatCurrency(value: number): string {
  return `${value.toFixed(2)} zł`;
}

function formatRate(rate: number): string {
  return `${(rate * 100)
    .toFixed(2)
    .replace(/\.?0+$/, '')
    .replace('.', ',')}%`;
}

export default function InvoicePreview({
  data,
  taxParams,
  invoiceNumber,
}: InvoicePreviewProps) {
  const { client, contractor, contract, remuneration, calculations } = data;

  return (
    <div className='border border-secondary-subtle bg-body-tertiary p-4 p-md-5 shadow-sm rounded-4 invoice-preview d-flex flex-column justify-content-between'>
      <div>
        {/* Nagłówek */}
        <h2 className='text-center fw-bold mb-2 text-body-emphasis'>
          RACHUNEK do umowy zlecenia
        </h2>
        <p className='text-center text-muted mb-4'>
          Numer rachunku:{' '}
          <span className='fw-semibold text-body'>
            {invoiceNumber ?? 'zostanie nadany przy pobieraniu PDF'}
          </span>
        </p>

        {/* Dane stron */}
        <div className='row mb-4'>
          <div className='col-md-6'>
            <h4 className='fw-bold mb-2'>Zleceniodawca</h4>
            <p className='mb-0'>{client.name}</p>
            <p className='mb-0'>{client.address}</p>
            {client.type === 'company' && client.nip && (
              <p className='mb-0'>NIP: {client.nip}</p>
            )}
            {client.type === 'private' && client.pesel && (
              <p className='mb-0'>PESEL: {client.pesel}</p>
            )}
          </div>

          <div className='col-md-6'>
            <h4 className='fw-bold mb-2'>Zleceniobiorca</h4>
            <p className='mb-0'>{contractor.name}</p>
            <p className='mb-0'>{contractor.address}</p>
            <p className='mb-0'>PESEL: {contractor.pesel}</p>
            {contractor.nip && <p className='mb-0'>NIP: {contractor.nip}</p>}
          </div>
        </div>

        {/* Dane umowy */}
        <div className='mb-4'>
          <h4 className='fw-bold mb-2'>Dane umowy</h4>
          {contract.number ? (
            <p className='mb-0'>Numer umowy: {contract.number}</p>
          ) : null}
          <p className='mb-0'>Data zawarcia: {contract.date}</p>
          <p className='mb-0'>
            Okres rozliczeniowy: {contract.periodStart} – {contract.periodEnd}
          </p>
          <p className='mb-0'>
            Typ umowy:{' '}
            {contract.type === 'monthly' ? 'miesięczna' : 'godzinowa'}
          </p>
        </div>

        {/* Wynagrodzenie */}
        <div className='mb-4'>
          <h4 className='fw-bold mb-2'>Wynagrodzenie</h4>
          <p className='mb-0'>
            Kwota brutto: {formatCurrency(remuneration.gross)}
          </p>
          {remuneration.hourlyRate !== undefined &&
            remuneration.hoursWorked !== undefined && (
              <p className='mb-0'>
                Stawka: {formatCurrency(remuneration.hourlyRate)} ×{' '}
                {remuneration.hoursWorked} h
              </p>
            )}
        </div>

        <div className='mb-4'>
          <h4 className='fw-bold mb-2'>Forma wypłaty</h4>
          {data.payment.method === 'CASH' ? (
            <p className='mb-0'>Gotówka</p>
          ) : data.payment.method === 'TRANSFER' &&
            data.payment.transferTarget === 'DECLARATION' ? (
            <p className='mb-0'>
              Przelew na rachunek bankowy zgodnie ze złożonym oświadczeniem.
            </p>
          ) : data.payment.method === 'TRANSFER' ? (
            <>
              <p className='mb-0'>Przelew na rachunek bankowy</p>
              {data.payment.accountHolder && (
                <p className='mb-0'>Właściciel: {data.payment.accountHolder}</p>
              )}
              {data.payment.bankName && (
                <p className='mb-0'>Bank: {data.payment.bankName}</p>
              )}
              {data.payment.accountNumber && (
                <p className='mb-0'>
                  Numer rachunku: {data.payment.accountNumber}
                </p>
              )}
            </>
          ) : (
            <p className='mb-0 text-danger'>Wybierz formę wypłaty.</p>
          )}
        </div>

        {/* Rozliczenie */}
        <div className='mb-4'>
          <h4 className='fw-bold mb-2'>Rozliczenie</h4>
          <Table striped borderless size='sm'>
            <tbody>
              <tr>
                <td>Wynagrodzenie brutto</td>
                <td className='text-end'>
                  {formatCurrency(remuneration.gross)}
                </td>
              </tr>

              <tr>
                <td colSpan={2} className='pt-3'>
                  <strong>Składki społeczne (zleceniobiorca)</strong>
                </td>
              </tr>
              <tr>
                <td>– emerytalna ({formatRate(taxParams.pensionRate)})</td>
                <td className='text-end'>
                  {formatCurrency(calculations.pensionContribution)}
                </td>
              </tr>
              <tr>
                <td>– rentowa ({formatRate(taxParams.rentRate)})</td>
                <td className='text-end'>
                  {formatCurrency(calculations.rentContribution)}
                </td>
              </tr>
              <tr>
                <td>– chorobowa</td>
                <td className='text-end'>
                  {formatCurrency(calculations.sicknessContribution)}
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Razem składki społeczne</strong>
                </td>
                <td className='text-end'>
                  <strong>
                    {formatCurrency(calculations.totalSocialContributions)}
                  </strong>
                </td>
              </tr>

              <tr>
                <td className='pt-3'>Podstawa składki zdrowotnej</td>
                <td className='text-end'>
                  {formatCurrency(calculations.healthContributionBase)}
                </td>
              </tr>

              <tr>
                <td>Składka zdrowotna ({formatRate(taxParams.healthRate)})</td>
                <td className='text-end'>
                  {formatCurrency(calculations.healthContribution)}
                </td>
              </tr>

              {calculations.youngReliefIncomeApplied > 0 ? (
                <tr>
                  <td>Przychód zwolniony (ulga dla młodych)</td>
                  <td className='text-end'>
                    {formatCurrency(calculations.youngReliefIncomeApplied)}
                  </td>
                </tr>
              ) : null}

              <tr>
                <td className='pt-3'>Koszty uzyskania przychodu</td>
                <td className='text-end'>
                  {formatCurrency(calculations.taxDeductibleCosts)}
                </td>
              </tr>

              <tr>
                <td>Podstawa opodatkowania (zaokrąglona)</td>
                <td className='text-end'>
                  {formatCurrency(calculations.taxableBase)}
                </td>
              </tr>

              {data.taxReduction && (
                <>
                  <tr>
                    <td>Zaliczka na PIT przed zmniejszeniem</td>
                    <td className='text-end'>
                      {formatCurrency(calculations.taxBeforeReduction)}
                    </td>
                  </tr>

                  <tr>
                    <td>Kwota zmniejszająca podatek</td>
                    <td className='text-end'>
                      {formatCurrency(calculations.taxReductionAmountApplied)}
                    </td>
                  </tr>
                </>
              )}

              <tr>
                <td>
                  <strong>Zaliczka na PIT</strong>
                </td>
                <td className='text-end'>
                  <strong>{formatCurrency(calculations.tax)}</strong>
                </td>
              </tr>

              <tr className='border-top'>
                <td className='pt-2'>
                  <strong>Kwota netto do wypłaty</strong>
                </td>
                <td className='text-end pt-2'>
                  <strong>{formatCurrency(calculations.net)}</strong>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Słownie</strong>
                </td>
                <td className={'text-end'}>
                  {numberToWords(calculations.net)}
                </td>
              </tr>
            </tbody>
          </Table>
        </div>

        <div className='mb-4'>
          <h4 className='fw-bold mb-2'>Uwagi</h4>
          <p className='mb-0'>{data.notes ?? '–'}</p>
        </div>

        {/* Podpisy */}
        <Row className='mt-5'>
          <Col md={6}>
            <div className='border-top pt-2'>
              <strong>Podpis zleceniodawcy</strong>
            </div>
          </Col>
          <Col md={6}>
            <div className='border-top pt-2'>
              <strong>Podpis zleceniobiorcy</strong>
            </div>
          </Col>
        </Row>
      </div>

      {/* Stopka dokumentu */}
      <div className='mt-5 pt-3 border-top text-muted d-flex justify-content-between align-items-center small'>
        <span>
          Dokument wygenerowany za pomocą Invoice Creator –{' '}
          {getSiteDisplayUrl()}
        </span>
        <span>Strona 1 z 1</span>
      </div>
    </div>
  );
}
