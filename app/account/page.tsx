import { deleteInvoice, deleteParty } from '@/app/actions/savedData';
import { getCurrentUserId } from '@/lib/currentUser';
import {
  getSavedInvoicesForUser,
  getSavedPartiesForUser,
} from '@/lib/savedDataAccess';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Button, Container, Table } from 'react-bootstrap';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function removeInvoice(formData: FormData) {
  'use server';
  await deleteInvoice(String(formData.get('id')));
  revalidatePath('/account');
}

async function removeParty(formData: FormData) {
  'use server';
  await deleteParty(String(formData.get('id')));
  revalidatePath('/account');
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
      <h1 className='mb-4'>Moje konto</h1>

      <h2 className='h4'>Zapisane rachunki</h2>
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
                    <Button size='sm' variant='outline-danger' type='submit'>
                      Usuń
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <h2 className='h4'>Zapisane dane stron</h2>
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
                    <Button size='sm' variant='outline-danger' type='submit'>
                      Usuń
                    </Button>
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
