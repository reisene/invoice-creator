import TaxParamForm from '@/components/admin/TaxParamForm';
import { prisma } from '@/lib/db';
import type { Metadata } from 'next';
import { Card, CardBody, Table } from 'react-bootstrap';

export const metadata: Metadata = {
  title: 'Parametry podatkowe',
};

function formatValue(value: unknown): string {
  return String(value);
}

export default async function AdminTaxParamsPage() {
  const taxParams = await prisma.taxParam.findMany({
    orderBy: { year: 'desc' },
  });

  return (
    <>
      <div className='mb-4'>
        <h1 className={'mb-4'}>Parametry podatkowe</h1>
        <p className={'text-body-secondary mb-0'}>
          Lista zapisanych parametrów używanych do wyliczania rachunków
        </p>
      </div>

      <TaxParamForm />

      <Card className={'border-secondary-subtle shadow-sm'}>
        <CardBody className={'p-0'}>
          <Table responsive hover className={'mb-0 align-middle'}>
            <thead>
              <tr>
                <th>Rok</th>
                <th>Emerytalna</th>
                <th>Rentowa</th>
                <th>Chorobowa</th>
                <th>Zdrowotna</th>
                <th>Podatek I próg</th>
                <th>Podatek II próg</th>
                <th>Próg podatkowy</th>
                <th>Minimalne wynagrodzenie</th>
                <th>Utworzono</th>
                <th>Autor</th>
              </tr>
            </thead>
            <tbody>
              {taxParams.length === 0 ? (
                <tr>
                  <td colSpan={11}>Brak parametrów</td>
                </tr>
              ) : (
                taxParams.map((param) => (
                  <tr key={param.id}>
                    <td>{param.year}</td>
                    <td>{formatValue(param.pensionRate)}</td>
                    <td>{formatValue(param.rentRate)}</td>
                    <td>{formatValue(param.sicknessRate)}</td>
                    <td>{formatValue(param.healthRate)}</td>
                    <td>{formatValue(param.taxRate1)}</td>
                    <td>{formatValue(param.taxRate2)}</td>
                    <td>{formatValue(param.taxThreshold)}</td>
                    <td>{formatValue(param.minimumWage)}</td>
                    <td>{param.createdAt.toLocaleDateString('pl-PL')}</td>
                    <td>{param.createdBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </>
  );
}
