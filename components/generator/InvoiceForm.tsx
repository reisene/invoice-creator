import type {
  ClientType,
  ContractorStatus,
  ContractType,
  CostType,
  InvoiceFormData,
  TaxReductionAmount,
} from '@/types/invoiceForm';
import { Col, Form, Row } from 'react-bootstrap';

interface InvoiceFormProps {
  data: InvoiceFormData;
  onChange: (data: InvoiceFormData) => void;
}

export default function InvoiceForm({ data, onChange }: InvoiceFormProps) {
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
              <Form.Label>Stawka za godzinę (brutto)</Form.Label>
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
                step='0.5'
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

      {/* Opcje */}
      <h3 className='mb-3 mt-4'>Status i opcje</h3>

      <Row className='mb-3'>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Status zleceniobiorcy</Form.Label>
            <Form.Select
              value={data.contractorStatus}
              onChange={(e) =>
                updateField(
                  'contractorStatus',
                  e.target.value as ContractorStatus,
                )
              }
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
            <Form.Label>Koszty uzyskania przychodu</Form.Label>
            <Form.Select
              value={data.costType}
              onChange={(e) =>
                updateField('costType', e.target.value as CostType)
              }
              required
            >
              <option value='20'>20% (standard)</option>
              <option value='50'>50% (prawa autorskie)</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      <Row className='mb-3'>
        <Col md={6}>
          <Form.Group>
            <Form.Check
              type='checkbox'
              label='Dobrowolna składka chorobowa'
              checked={data.voluntarySickness}
              onChange={(e) =>
                updateField('voluntarySickness', e.target.checked)
              }
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Check
              type='checkbox'
              label='Ulga dla młodych (0% PIT do limitu)'
              checked={data.youngRelief}
              onChange={(e) => updateField('youngRelief', e.target.checked)}
            />
          </Form.Group>
        </Col>
      </Row>

      <Row className='mb-3'>
        <Col md={6}>
          <Form.Group>
            <Form.Check
              type='checkbox'
              label='Stosuję ulgę podatkową (koszty uzyskania przychodu)'
              checked={data.taxReduction}
              onChange={(e) => updateField('taxReduction', e.target.checked)}
            />
          </Form.Group>
        </Col>
      </Row>

      {data.taxReduction && (
        <Row className='mb-3'>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Wysokość ulgi</Form.Label>
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
                <option value={300}>300 zł (jedna umowa)</option>
                <option value={150}>150 zł (dwie umowy)</option>
                <option value={0}>0 zł (trzy lub więcej umów)</option>
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
