'use client';

import { calculateInvoice } from '@/lib/calculateInvoice';
import { DEFAULT_TAX_PARAMS } from '@/lib/taxConstants';
import type { InvoiceFormData } from '@/types/invoiceForm';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Badge, Button, Card, Form } from 'react-bootstrap';
import {
  BsArrowRight,
  BsCheckCircleFill,
  BsLightningChargeFill,
} from 'react-icons/bs';

type ContractorStatus = 'standard' | 'student_under_26' | 'with_employment';

const PRESET_AMOUNTS = [3000, 4500, 6000, 8000];

function formatPln(value: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function buildPresetFormData(
  gross: number,
  status: ContractorStatus,
): InvoiceFormData {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthEnd = new Date();
  monthEnd.setMonth(monthEnd.getMonth() + 1, 0);

  return {
    clientType: 'company',
    clientName: '',
    clientAddress: '',
    contractorName: '',
    contractorAddress: '',
    contractorPesel: '',
    contractDate: today,
    periodStart: monthStart.toISOString().slice(0, 10),
    periodEnd: monthEnd.toISOString().slice(0, 10),
    contractType: 'monthly',
    grossAmount: gross,
    contractorStatus: status,
    voluntarySickness: false,
    costType: '20',
    youngRelief: status === 'student_under_26',
    yearToDateTaxableIncome: 0,
    yearToDateYoungReliefIncome: 0,
    taxReduction: status !== 'student_under_26',
    taxReductionAmount: 300,
    paymentMethod: '',
    transferTarget: '',
  };
}

export default function HeroSimulator() {
  const router = useRouter();
  const [gross, setGross] = useState<number>(4500);
  const [status, setStatus] = useState<ContractorStatus>('standard');

  const invoiceData = useMemo(() => {
    const formData = buildPresetFormData(gross, status);
    return calculateInvoice(formData, DEFAULT_TAX_PARAMS);
  }, [gross, status]);

  const handleLaunchGenerator = () => {
    try {
      const preset = buildPresetFormData(gross, status);
      sessionStorage.setItem('generator_preset_data', JSON.stringify(preset));
    } catch {
      // Ignoruj błąd zapisu do pamięci podręcznej
    }
    router.push('/generator');
  };

  const { calculations } = invoiceData;

  return (
    <Card className='border border-secondary-subtle bg-body-tertiary shadow-lg rounded-4 p-3 p-sm-4 hover-elevate'>
      <div className='d-flex align-items-center justify-content-between mb-3'>
        <Badge
          bg='primary-subtle'
          className='text-primary border border-primary-subtle px-2 py-1 rounded-pill fw-medium d-inline-flex align-items-center gap-1'
        >
          <BsLightningChargeFill />
          <span>Symulacja na żywo</span>
        </Badge>
        <span className='small text-body-secondary'>Stawki 2026</span>
      </div>

      <div className='mb-3'>
        <label
          htmlFor='hero-gross-input'
          className='form-label small fw-bold text-body-secondary mb-1'
        >
          Wynagrodzenie brutto:
        </label>
        <div className='input-group'>
          <Form.Control
            id='hero-gross-input'
            type='number'
            step='0.01'
            min={0}
            value={gross}
            onChange={(e) => {
              const val = Number(e.target.value);
              setGross(Number.isNaN(val) ? 0 : Math.max(0, val));
            }}
            className='form-control-lg fw-bold'
          />
          <span className='input-group-text fw-medium'>zł</span>
        </div>
        <div className='d-flex gap-1 mt-2 flex-wrap'>
          {PRESET_AMOUNTS.map((amt) => (
            <button
              key={amt}
              type='button'
              onClick={() => setGross(amt)}
              className={`btn btn-sm rounded-pill px-2 py-0 ${
                gross === amt ? 'btn-primary' : 'btn-outline-secondary'
              }`}
            >
              {amt.toLocaleString('pl-PL')} zł
            </button>
          ))}
        </div>
      </div>

      <div className='mb-3'>
        <span className='form-label small fw-bold text-body-secondary mb-1 d-block'>
          Status wykonawcy:
        </span>
        <div className='d-flex gap-1 flex-wrap'>
          <button
            type='button'
            className={`btn btn-sm rounded-pill flex-grow-1 ${
              status === 'standard' ? 'btn-primary' : 'btn-outline-secondary'
            }`}
            onClick={() => setStatus('standard')}
          >
            Standard
          </button>
          <button
            type='button'
            className={`btn btn-sm rounded-pill flex-grow-1 ${
              status === 'student_under_26'
                ? 'btn-primary'
                : 'btn-outline-secondary'
            }`}
            onClick={() => setStatus('student_under_26')}
          >
            Student &lt; 26 lat
          </button>
          <button
            type='button'
            className={`btn btn-sm rounded-pill flex-grow-1 ${
              status === 'with_employment'
                ? 'btn-primary'
                : 'btn-outline-secondary'
            }`}
            onClick={() => setStatus('with_employment')}
          >
            Etat (zbieg)
          </button>
        </div>
      </div>

      {/* Kalkulacja */}
      <div className='p-3 rounded-3 bg-body border border-secondary-subtle mb-3 small'>
        <div className='d-flex justify-content-between mb-1'>
          <span className='text-body-secondary'>Składki społeczne ZUS:</span>
          <span className='fw-semibold'>
            {calculations.totalSocialContributions > 0 ? (
              `-${formatPln(calculations.totalSocialContributions)}`
            ) : (
              <span className='text-success d-inline-flex align-items-center gap-1'>
                <BsCheckCircleFill className='small' /> 0,00 zł (zwolniony)
              </span>
            )}
          </span>
        </div>
        <div className='d-flex justify-content-between mb-1'>
          <span className='text-body-secondary'>Składka zdrowotna 9%:</span>
          <span className='fw-semibold'>
            {calculations.healthContribution > 0 ? (
              `-${formatPln(calculations.healthContribution)}`
            ) : (
              <span className='text-success d-inline-flex align-items-center gap-1'>
                <BsCheckCircleFill className='small' /> 0,00 zł (zwolniony)
              </span>
            )}
          </span>
        </div>
        <div className='d-flex justify-content-between mb-2'>
          <span className='text-body-secondary'>Zaliczka na PIT:</span>
          <span className='fw-semibold'>
            {calculations.tax > 0 ? (
              `-${formatPln(calculations.tax)}`
            ) : (
              <span className='text-success d-inline-flex align-items-center gap-1'>
                <BsCheckCircleFill className='small' /> 0,00 zł{' '}
                {status === 'student_under_26'
                  ? '(Ulga PIT 0)'
                  : '(kwota wolna)'}
              </span>
            )}
          </span>
        </div>
        <div className='border-top border-secondary-subtle pt-2 d-flex justify-content-between align-items-baseline'>
          <span className='fw-bold text-body-emphasis'>
            Do wypłaty (Netto):
          </span>
          <span className='fs-4 fw-bold text-primary'>
            {formatPln(calculations.net)}
          </span>
        </div>
      </div>

      <Button
        variant='primary'
        className='w-100 rounded-pill d-flex align-items-center justify-content-center gap-2 py-2 fw-semibold shadow-sm'
        onClick={handleLaunchGenerator}
      >
        <span>Wystaw rachunek z tą kwotą</span>
        <BsArrowRight />
      </Button>
    </Card>
  );
}
