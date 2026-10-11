import {
  deleteAllInvoices,
  deleteAllParties,
  deleteInvoice,
  deleteParty,
} from '@/app/actions/savedData';
import { getCurrentUserId } from '@/lib/currentUser';
import {
  getSavedInvoicesForUser,
  getSavedPartiesForUser,
} from '@/lib/savedDataAccess';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Button, Container, Table } from 'react-bootstrap';
import ConfirmButton from './ConfirmButton';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function removeInvoice(formData: FormData) {
  'use server';
  await deleteInvoice(String(formData.get('id')));
  revalidatePath('/account/invoices');
}

async function removeParty(formData: FormData) {
  'use server';
  await deleteParty(String(formData.get('id')));
  revalidatePath('/account/invoices');
}

async function removeAllInvoices() {
  'use server';
  await deleteAllInvoices();
  revalidatePath('/account/invoices');
}

async function removeAllParties() {
  'use server';
  await deleteAllParties();
  revalidatePath('/account/invoices');
}

export default async function AccountPage() {
  const userId = await getCurrentUserId();
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
        {invoices.length > 0 ? (
          <form action={removeAllInvoices}>
            <ConfirmButton
              size='sm'
              variant='danger'
              confirmMessage='Usunąć wszystkie zapisane rachunki? Nie można tego cofnąć.'
            >
              Usuń wszystkie
            </ConfirmButton>
          </form>
        ) : null}
      </div>
      {invoices.length === 0 ? (
        <p className='text-muted'>
          Nie masz jeszcze zapisanych rachunków.{' '}
          <a href='/generator'>Utwórz pierwszy</a>.
        </p>
      ) : (
        <Table responsive hover className='mb-5 align-middle'>
          <thead>
            <tr>
              <th>Rachunek</th>
              <th>Numer rachunku</th>
              <th>Okres od</th>
              <th className='text-end'>Netto</th>
              <th>Zmieniono</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.title}</td>
                <td>{invoice.invoiceNumber}</td>
                <td>{invoice.periodStart}</td>
                <td className='text-end'>
                  {Number(invoice.net).toFixed(2).replace('.', ',')} zł
                </td>
                <td>{invoice.updatedAt.toLocaleDateString('pl-PL')}</td>
                <td className='text-end'>
                  <Button
                    size='sm'
                    variant='outline-primary'
                    href={`/generator?invoice=${invoice.id}`}
                    className='me-2'
                  >
                    Otwórz
                  </Button>
                  <form action={removeInvoice} className='d-inline'>
                    <input type='hidden' name='id' value={invoice.id} />
                    <ConfirmButton
                      size='sm'
                      variant='outline-danger'
                      confirmMessage='Usunąć ten wpis? Nie można tego cofnąć.'
                    >
                      Usuń
                    </ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <div className='d-flex justify-content-between align-items-center mb-2'>
        <h2 className='h4 mb-0'>Zapisane dane stron</h2>
        {parties.length > 0 ? (
          <form action={removeAllParties}>
            <ConfirmButton
              size='sm'
              variant='danger'
              confirmMessage='Usunąć wszystkie zapisane dane stron? Nie można tego cofnąć.'
            >
              Usuń wszystkie
            </ConfirmButton>
          </form>
        ) : null}
      </div>
      {parties.length === 0 ? (
        <p className='text-muted'>
          Brak zapisanych danych. Zapiszesz je w generatorze.
        </p>
      ) : (
        <Table responsive hover className='align-middle'>
          <thead>
            <tr>
              <th>Rola</th>
              <th>Nazwa</th>
              <th>Adres</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {parties.map((party) => (
              <tr key={party.id}>
                <td>
                  {party.kind === 'CLIENT' ? 'Zleceniodawca' : 'Zleceniobiorca'}
                </td>
                <td>{party.name}</td>
                <td>{party.address}</td>
                <td className='text-end'>
                  <form action={removeParty} className='d-inline'>
                    <input type='hidden' name='id' value={party.id} />
                    <ConfirmButton
                      size='sm'
                      variant='outline-danger'
                      confirmMessage='Usunąć ten wpis? Nie można tego cofnąć.'
                    >
                      Usuń
                    </ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );
}
