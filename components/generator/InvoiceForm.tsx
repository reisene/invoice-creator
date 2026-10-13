import type {
  ClientType,
  ContractorStatus,
  ContractType,
  CostType,
  InvoiceFormData,
  TaxReductionAmount,
} from '@/types/invoiceForm';
import type { UserBankAccountDto } from '@/types/savedData';
import type { TaxParams } from '@/types/taxParams';
import Link from 'next/link';
import { Col, Form, Row } from 'react-bootstrap';
import { BsQuestionCircle } from 'react-icons/bs';

interface InvoiceFormProps {
  data: InvoiceFormData;
  onChange: (data: InvoiceFormData) => void;
  taxParams?: TaxParams;
  bankAccount: UserBankAccountDto | null;
}

const percent = (rate: number) => `${Math.round(rate * 10000) / 100}%`;

export default function InvoiceForm({
  data,
  onChange,
  taxParams,
  bankAccount,
}: InvoiceFormProps) {
  const fullReduction = taxParams?.monthlyTaxReduction ?? 300;
  const updateField = <K extends keyof InvoiceFormData>(
    field: K,
    value: InvoiceFormData[K],
  ) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <Form>
      {/* Zleceniodawca */}
      <h3 className='mb-3'>Dane zleceniodawcy</h3>

      <Row className='mb-3'>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Typ zleceniodawcy</Form.Label>
            <Form.Select
              value={data.clientType}
              onChange={(e) =>
                updateField('clientType', e.target.value as ClientType)
              }
            >
              <option value='company'>Firma</option>
              <option value='private'>Osoba prywatna</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      {data.youngRelief ? (
        <Row className='mb-3'>
          <Col md={6}>
            <Form.Group>
              <Form.Label>
                Przychód objęty ulgą dla młodych od początku roku
              </Form.Label>
              <Form.Control
                type='number'
                step='0.01'
                min={0}
                max={taxParams?.yearlyYoungReliefLimit}
                value={data.yearToDateYoungReliefIncome}
                onChange={(e) =>
                  updateField(
                    'yearToDateYoungReliefIncome',
                    e.target.value ? Number(e.target.value) : 0,
                  )
                }
                required
              />
              <Form.Text>
                Wpisz przychód z tego roku, który wcześniej wykorzystał limit
                ulgi. Bieżący rachunek zostanie doliczony automatycznie.
              </Form.Text>
            </Form.Group>
          </Col>
        </Row>
      ) : null}

      <Row className='mb-3'>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Nazwa / Imię i nazwisko</Form.Label>
            <Form.Control
              type='text'
              value={data.clientName}
              onChange={(e) => updateField('clientName', e.target.value)}
              required
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Adres</Form.Label>
            <Form.Control
              as='textarea'
              rows={3}
              value={data.clientAddress}
              onChange={(e) => updateField('clientAddress', e.target.value)}
              required
            />
          </Form.Group>
        </Col>
      </Row>

      <Row className='mb-3'>
        {data.clientType === 'company' ? (
          <Col md={6}>
            <Form.Group>
              <Form.Label>NIP</Form.Label>
              <Form.Control
                type='text'
                value={data.clientNip ?? ''}
                onChange={(e) =>
                  updateField('clientNip', e.target.value || undefined)
                }
                required={data.clientType === 'company'}
              />
            </Form.Group>
          </Col>
        ) : (
          <Col md={6}>
            <Form.Group>
              <Form.Label>PESEL</Form.Label>
              <Form.Control
                type='text'
                value={data.clientPesel ?? ''}
                onChange={(e) =>
                  updateField('clientPesel', e.target.value || undefined)
                }
                required={data.clientType === 'private'}
              />
            </Form.Group>
          </Col>
        )}
      </Row>

      {/* Zleceniobiorca */}
      <h3 className='mb-3 mt-4'>Dane zleceniobiorcy</h3>

      <Row className='mb-3'>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Imię i nazwisko</Form.Label>
            <Form.Control
              type='text'
              value={data.contractorName}
              onChange={(e) => updateField('contractorName', e.target.value)}
              required
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Adres</Form.Label>
            <Form.Control
              as='textarea'
              rows={3}
              value={data.contractorAddress}
              onChange={(e) => updateField('contractorAddress', e.target.value)}
              required
            />
          </Form.Group>
        </Col>
      </Row>

      <Row className='mb-3'>
        <Col md={6}>
          <Form.Group>
            <Form.Label>PESEL</Form.Label>
            <Form.Control
              type='text'
              value={data.contractorPesel}
              onChange={(e) => updateField('contractorPesel', e.target.value)}
              required
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>NIP (opcjonalnie)</Form.Label>
            <Form.Control
              type='text'
              value={data.contractorNip ?? ''}
              onChange={(e) =>
                updateField('contractorNip', e.target.value || undefined)
              }
            />
          </Form.Group>
        </Col>
      </Row>

      {/* Dane umowy */}
      <h3 className='mb-3 mt-4'>Dane umowy</h3>

      <Row className='mb-3'>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Numer umowy</Form.Label>
            <Form.Control
              type='text'
              value={data.contractNumber ?? ''}
              onChange={(e) =>
                updateField('contractNumber', e.target.value || undefined)
              }
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Data zawarcia umowy</Form.Label>
            <Form.Control
              type='date'
              value={data.contractDate}
              onChange={(e) => updateField('contractDate', e.target.value)}
              required
            />
          </Form.Group>
        </Col>
      </Row>

      <Row className='mb-3'>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Okres rozliczeniowy – od</Form.Label>
            <Form.Control
              type='date'
              value={data.periodStart}
              onChange={(e) => updateField('periodStart', e.target.value)}
              required
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Okres rozliczeniowy – do</Form.Label>
            <Form.Control
              type='date'
              value={data.periodEnd}
              onChange={(e) => updateField('periodEnd', e.target.value)}
              required
            />
          </Form.Group>
        </Col>
      </Row>

      <Row className='mb-3'>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Typ umowy</Form.Label>
            <Form.Select
              value={data.contractType}
              onChange={(e) =>
                updateField('contractType', e.target.value as ContractType)
              }
              required
            >
              <option value='monthly'>Miesięczna</option>
              <option value='hourly'>Godzinowa</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      {/* Wynagrodzenie */}
      <h3 className='mb-3 mt-4'>Wynagrodzenie</h3>

      {data.contractType === 'monthly' ? (
        <Row className='mb-3'>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Kwota brutto (miesięcznie)</Form.Label>
              <Form.Control
                type='number'
                step='0.01'
                min={0}
                value={data.grossAmount ?? ''}
                onChange={(e) =>
                  updateField(
                    'grossAmount',
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                required={data.contractType === 'monthly'}
              />
            </Form.Group>
          </Col>
        </Row>
      ) : (
        <Row className='mb-3'>
          <Col md={6}>
            <Form.Group>
              <Form.Label className='d-flex align-items-center justify-content-between'>
                <span>Stawka za godzinę (brutto)</span>
                <Link
                  href='/help/podstawy/minimalna-stawka-godzinowa'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-primary text-decoration-none small d-inline-flex align-items-center gap-1'
                  title='Pomoc: Minimalna stawka godzinowa'
                >
                  <BsQuestionCircle className='small' />
                  <span style={{ fontSize: '0.8rem' }}>Pomoc</span>
                </Link>
              </Form.Label>
              <Form.Control
                type='number'
                step='0.01'
                min={0}
                value={data.hourlyRate ?? ''}
                onChange={(e) =>
                  updateField(
                    'hourlyRate',
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                required={data.contractType === 'hourly'}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Liczba godzin</Form.Label>
              <Form.Control
                type='number'
                step='any'
                min={0}
                value={data.hoursWorked ?? ''}
                onChange={(e) =>
                  updateField(
                    'hoursWorked',
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                required={data.contractType === 'hourly'}
              />
            </Form.Group>
          </Col>
        </Row>
      )}

      <h3 className='mb-3 mt-4'>Forma wypłaty</h3>
      <Row className='mb-3'>
        <Col md={8}>
          <Form.Group>
            <Form.Label>Sposób wypłaty wynagrodzenia</Form.Label>
            <Form.Select
              value={data.paymentMethod}
              onChange={(e) => {
                const paymentMethod = e.target
                  .value as InvoiceFormData['paymentMethod'];
                if (paymentMethod === 'CASH') {
                  onChange({
                    ...data,
                    paymentMethod,
                    transferTarget: '',
                    bankAccountHolder: undefined,
                    bankName: undefined,
                    bankAccountNumber: undefined,
                  });
                } else {
                  updateField('paymentMethod', paymentMethod);
                }
              }}
              required
            >
              <option value=''>Wybierz formę wypłaty</option>
              <option value='CASH'>Gotówka</option>
              <option value='TRANSFER'>Przelew</option>
            </Form.Select>
            {!data.paymentMethod && (
              <Form.Text className='text-warning-emphasis'>
                Ten rachunek nie ma wybranej formy wypłaty (np. został zapisany
                w starszej wersji). Wybierz ją, aby wygenerować PDF lub zapisać
                zmiany.
              </Form.Text>
            )}
          </Form.Group>
        </Col>
      </Row>

      {data.paymentMethod === 'TRANSFER' && (
        <Row className='mb-3'>
          <Col md={8}>
            <Form.Group>
              <Form.Label>Rachunek do przelewu</Form.Label>
              <Form.Select
                value={data.transferTarget}
                onChange={(e) => {
                  const transferTarget = e.target
                    .value as InvoiceFormData['transferTarget'];
                  onChange({
                    ...data,
                    transferTarget,
                    bankAccountHolder:
                      transferTarget === 'SAVED_ACCOUNT'
                        ? bankAccount?.accountHolder
                        : undefined,
                    bankName:
                      transferTarget === 'SAVED_ACCOUNT'
                        ? bankAccount?.bankName
                        : undefined,
                    bankAccountNumber:
                      transferTarget === 'SAVED_ACCOUNT'
                        ? bankAccount?.accountNumber
                        : undefined,
                  });
                }}
                required
              >
                <option value=''>Wybierz rachunek</option>
                {bankAccount && (
                  <option value='SAVED_ACCOUNT'>
                    Zapisany rachunek bankowy
                  </option>
                )}
                <option value='DECLARATION'>
                  Rachunek zgodnie ze złożonym oświadczeniem
                </option>
              </Form.Select>
              {!bankAccount && (
                <Form.Text>
                  Możesz dodać rachunek bankowy w ustawieniach konta.
                </Form.Text>
              )}
            </Form.Group>
          </Col>
        </Row>
      )}
      {data.paymentMethod === 'TRANSFER' &&
        data.transferTarget === 'SAVED_ACCOUNT' &&
        bankAccount && (
          <Row className='mb-3'>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Właściciel rachunku</Form.Label>
                <Form.Control value={bankAccount.accountHolder} readOnly />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Bank</Form.Label>
                <Form.Control value={bankAccount.bankName} readOnly />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Numer rachunku</Form.Label>
                <Form.Control value={bankAccount.accountNumber} readOnly />
              </Form.Group>
            </Col>
          </Row>
        )}

      {/* Opcje */}
      <h3 className='mb-3 mt-4'>Status i opcje</h3>

      <Row className='mb-3'>
        <Col md={6}>
          <Form.Group>
            <Form.Label className='d-flex align-items-center justify-content-between'>
              <span>Status zleceniobiorcy</span>
              <Link
                href={
                  data.contractorStatus === 'student_under_26'
                    ? '/help/zus/status-ucznia-i-studenta-do-26-lat'
                    : data.contractorStatus === 'with_employment'
                      ? '/help/zus/zbieg-tytulow-etat-i-zlecenie'
                      : '/help/podstawy/czym-jest-rachunek-do-umowy-zlecenia'
                }
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary text-decoration-none small d-inline-flex align-items-center gap-1'
                title='Pomoc: Status zleceniobiorcy i składki ZUS'
              >
                <BsQuestionCircle className='small' />
                <span style={{ fontSize: '0.8rem' }}>Pomoc</span>
              </Link>
            </Form.Label>
            <Form.Select
              value={data.contractorStatus}
              onChange={(e) => {
                const status = e.target.value as ContractorStatus;
                if (status === 'student_under_26') {
                  onChange({
                    ...data,
                    contractorStatus: status,
                    voluntarySickness: false,
                    youngRelief: true,
                  });
                } else if (status === 'with_employment') {
                  onChange({
                    ...data,
                    contractorStatus: status,
                    voluntarySickness: false,
                  });
                } else {
                  updateField('contractorStatus', status);
                }
              }}
              required
            >
              <option value='standard'>Zwykłe zlecenie</option>
              <option value='student_under_26'>Student do 26 lat</option>
              <option value='with_employment'>Zbieg z etatem</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label className='d-flex align-items-center justify-content-between'>
              <span>Koszty uzyskania przychodu</span>
              <Link
                href='/help/podatki/koszty-uzyskania-przychodu-20-vs-50'
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary text-decoration-none small d-inline-flex align-items-center gap-1'
                title='Pomoc: Koszty autorskie 50% vs standardowe 20%'
              >
                <BsQuestionCircle className='small' />
                <span style={{ fontSize: '0.8rem' }}>Pomoc</span>
              </Link>
            </Form.Label>
            <Form.Select
              value={data.costType}
              onChange={(e) =>
                updateField('costType', e.target.value as CostType)
              }
              required
            >
              <option value='20'>
                {percent(taxParams?.costRateStandard ?? 0.2)} (standard)
              </option>
              <option value='50'>
                {percent(taxParams?.costRateArtistic ?? 0.5)} (prawa autorskie)
              </option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      <Row className='mb-3'>
        <Col md={6}>
          <Form.Group>
            <Form.Label>
              Dochód do opodatkowania uzyskany od początku roku
            </Form.Label>
            <Form.Control
              type='number'
              step='1'
              min={0}
              value={data.yearToDateTaxableIncome}
              onChange={(e) =>
                updateField(
                  'yearToDateTaxableIncome',
                  e.target.value ? Number(e.target.value) : 0,
                )
              }
              required
            />
            <Form.Text>
              Wpisz dotychczasową podstawę opodatkowania według skali z tego
              roku, bez bieżącego rachunku. Jeśli jej nie znasz, pozostaw 0.
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>

      <Row className='mb-3'>
        <Col md={6}>
          <Form.Group>
            <div className='d-flex align-items-center justify-content-between'>
              <Form.Check
                type='checkbox'
                id='voluntarySickness'
                label='Dobrowolna składka chorobowa'
                checked={
                  data.voluntarySickness && data.contractorStatus === 'standard'
                }
                disabled={data.contractorStatus !== 'standard'}
                onChange={(e) =>
                  updateField('voluntarySickness', e.target.checked)
                }
              />
              <Link
                href='/help/zus/dobrowolne-ubezpieczenie-chorobowe'
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary text-decoration-none small d-inline-flex align-items-center gap-1 ms-2 flex-shrink-0'
                title='Pomoc: Dobrowolne ubezpieczenie chorobowe'
              >
                <BsQuestionCircle className='small' />
                <span style={{ fontSize: '0.8rem' }}>Pomoc</span>
              </Link>
            </div>
            {data.contractorStatus !== 'standard' && (
              <Form.Text muted>
                {data.contractorStatus === 'student_under_26'
                  ? 'Student do 26 lat jest zwolniony ze składek ZUS i NFZ.'
                  : 'Przy zbiegu z etatem opłacana jest wyłącznie składka zdrowotna.'}
              </Form.Text>
            )}
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <div className='d-flex align-items-center justify-content-between'>
              <Form.Check
                type='checkbox'
                id='youngRelief'
                label='Ulga dla młodych (0% PIT do limitu)'
                checked={data.youngRelief}
                onChange={(e) => updateField('youngRelief', e.target.checked)}
              />
              <Link
                href='/help/podatki/ulga-dla-mlodych-zerowy-pit'
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary text-decoration-none small d-inline-flex align-items-center gap-1 ms-2 flex-shrink-0'
                title='Pomoc: Ulga dla młodych (zerowy PIT)'
              >
                <BsQuestionCircle className='small' />
                <span style={{ fontSize: '0.8rem' }}>Pomoc</span>
              </Link>
            </div>
            <Form.Text muted>
              Dla osób poniżej 26 lat. Wymaga złożenia zleceniodawcy
              oświadczenia o zastosowaniu ulgi.
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>

      <Row className='mb-3'>
        <Col md={6}>
          <Form.Group>
            <div className='d-flex align-items-center justify-content-between'>
              <Form.Check
                type='checkbox'
                id='taxReduction'
                label='Kwota zmniejszająca podatek (oświadczenie PIT-2)'
                checked={data.taxReduction}
                onChange={(e) => updateField('taxReduction', e.target.checked)}
              />
              <Link
                href='/help/podatki/kwota-zmniejszajaca-podatek-pit-2'
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary text-decoration-none small d-inline-flex align-items-center gap-1 ms-2 flex-shrink-0'
                title='Pomoc: Oświadczenie PIT-2'
              >
                <BsQuestionCircle className='small' />
                <span style={{ fontSize: '0.8rem' }}>Pomoc</span>
              </Link>
            </div>
            <Form.Text muted>
              Możesz złożyć PIT-2 maksymalnie 3 płatnikom w danym miesiącu.
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>

      {data.taxReduction && (
        <Row className='mb-3'>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Wysokość kwoty zmniejszającej</Form.Label>
              <Form.Select
                value={data.taxReductionAmount}
                onChange={(e) =>
                  updateField(
                    'taxReductionAmount',
                    Number(e.target.value) as TaxReductionAmount,
                  )
                }
                required={data.taxReduction}
              >
                <option value={300}>
                  {fullReduction} zł (1/12 kwoty rocznej – 1 płatnik)
                </option>
                <option value={150}>
                  {fullReduction / 2} zł (1/24 kwoty rocznej – 2 płatników)
                </option>
                <option value={100}>
                  100 zł (1/36 kwoty rocznej – 3 płatników)
                </option>
                <option value={0}>0 zł</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
      )}

      {/* Uwagi */}
      <h3 className='mb-3 mt-4'>Uwagi (opcjonalnie)</h3>

      <Row className='mb-3'>
        <Col md={12}>
          <Form.Group>
            <Form.Label>Uwagi do rachunku</Form.Label>
            <Form.Control
              as='textarea'
              rows={3}
              value={data.notes ?? ''}
              onChange={(e) =>
                updateField('notes', e.target.value || undefined)
              }
              placeholder='Np. dodatkowe informacje dla zleceniodawcy'
            />
          </Form.Group>
        </Col>
      </Row>
    </Form>
  );
}
