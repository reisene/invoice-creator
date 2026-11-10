import { getCurrentUserIdWithTerms } from '@/lib/currentUser';
import { calculateInvoice } from '@/lib/invoice/calculateInvoice';
import {
  getPreviousInvoiceTaxableIncome,
  type InvoiceIncomeEntry,
} from '@/lib/invoice/invoiceIncome';
import { sanitizeInvoiceForm } from '@/lib/invoice/sanitizeInvoiceForm';
import { getAllTaxParams } from '@/lib/invoice/taxParams';
import {
  getSavedInvoicesForUser,
  getSavedPartiesForUser,
} from '@/lib/savedDataAccess';
import { decryptJson } from '@/lib/savedDataCrypto';
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

  const [invoices, parties, taxParams] = await Promise.all([
    getSavedInvoicesForUser(userId),
    getSavedPartiesForUser(userId),
    getAllTaxParams(),
  ]);

  const forms = invoices.map((invoice) => ({
    invoice,
    form: sanitizeInvoiceForm(decryptJson(invoice.data).data),
  }));
  const incomeEntries: InvoiceIncomeEntry[] = forms.flatMap(
    ({ invoice, form }) =>
      form && form.periodStart === invoice.periodStart
        ? [
            {
              id: invoice.id,
              uid: invoice.uid,
              createdAt: invoice.createdAt,
              form,
            },
          ]
        : [],
  );
  const netAmounts = new Map<string, string>();
  for (const { invoice, form } of forms) {
    if (!form || form.periodStart !== invoice.periodStart) continue;
    const hasUnreadablePrevious = forms.some(
      (candidate) =>
        candidate.invoice.id !== invoice.id &&
        candidate.invoice.periodStart.slice(0, 4) ===
          form.periodStart.slice(0, 4) &&
        candidate.invoice.periodStart <= form.periodStart &&
        (!candidate.form ||
          candidate.form.periodStart !== candidate.invoice.periodStart),
    );
    const params = [...taxParams]
      .reverse()
      .find((item) => item.year <= Number(form.periodStart.slice(0, 4)));
    if (hasUnreadablePrevious || !params) continue;
    const income = getPreviousInvoiceTaxableIncome(
      incomeEntries,
      {
        id: invoice.id,
        uid: invoice.uid,
        createdAt: invoice.createdAt,
        periodStart: form.periodStart,
        contractorPesel: form.contractorPesel,
      },
      params,
    );
    const net = calculateInvoice(
      {
        ...form,
        yearToDateTaxableIncome: form.yearToDateTaxableIncome + income,
      },
      params,
    ).calculations.net;
    netAmounts.set(invoice.id, `${net.toFixed(2).replace('.', ',')} zł`);
  }

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
        <>
          <p className='small text-body-secondary'>
            Kwoty netto są przeliczane na podstawie obecnie zapisanej historii
            wcześniejszych rachunków. Pobrane wcześniej pliki PDF nie są
            zmieniane.
          </p>
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
                      {netAmounts.get(invoice.id) ?? 'Nie można przeliczyć'}
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
        </>
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
