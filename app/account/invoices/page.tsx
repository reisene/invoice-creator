import { getCurrentUserIdWithTerms } from '@/lib/currentUser';
import {
  getSavedInvoicesForUser,
  getSavedPartiesForUser,
} from '@/lib/savedDataAccess';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Button, Container, Table } from 'react-bootstrap';
import DeleteSavedDataButton from './DeleteSavedDataButton';
import PartyEditor from './PartyEditor';

export const metadata: Metadata = { title: 'Moje rachunki i dane stron' };

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function AccountPage() {
  const userId = await getCurrentUserIdWithTerms();
  if (!userId) redirect('/auth/sign-in');

  const [invoices, parties] = await Promise.all([
    getSavedInvoicesForUser(userId),
    getSavedPartiesForUser(userId),
  ]);

  return (
    <Container className='py-4'>
      <p className='mb-2'>
        <a href='/account'>← Moje konto</a>
      </p>
      <h1 className='mb-4'>Moje rachunki i dane</h1>

      <div className='d-flex justify-content-between align-items-center mb-2'>
        <h2 className='h4 mb-0'>Zapisane rachunki</h2>
        <DeleteSavedDataButton
          target='allInvoices'
          label='Usuń wszystkie'
          confirmMessage='Usunąć wszystkie zapisane rachunki? Nie można tego cofnąć.'
          size='sm'
          variant='danger'
          showButton={invoices.length > 0}
        />
      </div>
      {invoices.length === 0 ? (
        <p className='text-muted'>
          Nie masz jeszcze zapisanych rachunków.{' '}
          <a href='/generator'>Utwórz pierwszy</a>.
        </p>
      ) : (
        <div className='card border border-secondary-subtle bg-body-tertiary rounded-4 shadow-sm overflow-hidden mb-5'>
          <Table responsive hover className='mb-0 align-middle'>
            <thead>
              <tr>
                <th className='ps-3'>Rachunek</th>
                <th>Numer rachunku</th>
                <th>Okres od</th>
                <th className='text-end'>Netto</th>
                <th>Zmieniono</th>
                <th className='pe-3' />
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className='ps-3 fw-medium'>{invoice.title}</td>
                  <td>{invoice.invoiceNumber}</td>
                  <td>{invoice.periodStart}</td>
                  <td className='text-end fw-semibold text-primary'>
                    {Number(invoice.net).toFixed(2).replace('.', ',')} zł
                  </td>
                  <td>{invoice.updatedAt.toLocaleDateString('pl-PL')}</td>
                  <td className='text-end pe-3'>
                    <Button
                      size='sm'
                      variant='outline-primary'
                      href={`/generator?invoice=${invoice.id}`}
                      className='me-2'
                    >
                      Otwórz
                    </Button>
                    <Button
                      size='sm'
                      variant='outline-secondary'
                      href={`/generator?duplicate=${invoice.id}`}
                      className='me-2'
                    >
                      Duplikuj
                    </Button>
                    <DeleteSavedDataButton
                      target='invoice'
                      id={invoice.id}
                      label='Usuń'
                      confirmMessage='Usunąć ten rachunek? Nie można tego cofnąć.'
                      size='sm'
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <div className='d-flex justify-content-between align-items-center mb-2'>
        <h2 className='h4 mb-0'>Zapisane dane stron</h2>
        <div className='d-flex gap-2'>
          <PartyEditor />
          <DeleteSavedDataButton
            target='allParties'
            label='Usuń wszystkie'
            confirmMessage='Usunąć wszystkie zapisane dane stron? Nie można tego cofnąć.'
            size='sm'
            variant='danger'
            showButton={parties.length > 0}
          />
        </div>
      </div>
      {parties.length === 0 ? (
        <p className='text-muted'>
          Brak zapisanych danych. Dodaj je tutaj lub zapisz w generatorze.
        </p>
      ) : (
        <div className='card border border-secondary-subtle bg-body-tertiary rounded-4 shadow-sm overflow-hidden'>
          <Table responsive hover className='mb-0 align-middle'>
            <thead>
              <tr>
                <th className='ps-3'>Rola</th>
                <th>Nazwa</th>
                <th>Adres</th>
                <th className='pe-3' />
              </tr>
            </thead>
            <tbody>
              {parties.map((party) => (
                <tr key={party.id}>
                  <td className='ps-3'>
                    <span className='badge bg-secondary-subtle text-secondary-emphasis border'>
                      {party.kind === 'CLIENT'
                        ? 'Zleceniodawca'
                        : 'Zleceniobiorca'}
                    </span>
                  </td>
                  <td className='fw-medium'>{party.name}</td>
                  <td className='text-muted small'>{party.address}</td>
                  <td className='text-end pe-3'>
                    <PartyEditor party={party} />
                    <DeleteSavedDataButton
                      target='party'
                      id={party.id}
                      label='Usuń'
                      confirmMessage='Usunąć te zapisane dane strony? Nie można tego cofnąć.'
                      size='sm'
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </Container>
  );
}
