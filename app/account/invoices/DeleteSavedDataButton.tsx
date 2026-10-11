'use client';

import {
  deleteAllInvoices,
  deleteAllParties,
  deleteInvoice,
  deleteParty,
} from '@/app/actions/savedData';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Alert, Button } from 'react-bootstrap';

type DeleteTarget = 'invoice' | 'party' | 'allInvoices' | 'allParties';

export default function DeleteSavedDataButton({
  target,
  id,
  label,
  confirmMessage,
  variant = 'outline-danger',
  size,
  className,
  showButton = true,
}: {
  target: DeleteTarget;
  id?: string;
  label: string;
  confirmMessage: string;
  variant?: 'danger' | 'outline-danger';
  size?: 'sm' | 'lg';
  className?: string;
  showButton?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  function handleDelete() {
    if (!window.confirm(confirmMessage)) return;
    setFeedback(null);

    startTransition(async () => {
      try {
        const result =
          target === 'invoice'
            ? await deleteInvoice(id ?? '')
            : target === 'party'
              ? await deleteParty(id ?? '')
              : target === 'allInvoices'
                ? await deleteAllInvoices()
                : await deleteAllParties();

        if (!result.ok) {
          setFeedback({ ok: false, message: result.error });
          return;
        }

        if (target === 'allInvoices') {
          setFeedback({
            ok: true,
            message: `Usunięto wszystkie rachunki (${result.data}).`,
          });
        } else if (target === 'allParties') {
          setFeedback({
            ok: true,
            message: `Usunięto wszystkie dane stron (${result.data}).`,
          });
        }
      } catch {
        setFeedback({
          ok: false,
          message: 'Nie udało się usunąć danych. Spróbuj ponownie.',
        });
        return;
      }

      router.refresh();
    });
  }

  return (
    <>
      {showButton && (
        <Button
          type='button'
          size={size}
          variant={variant}
          className={className}
          disabled={pending}
          onClick={handleDelete}
        >
          {pending ? 'Usuwanie…' : label}
        </Button>
      )}
      {feedback && (
        <Alert
          className='mt-2 mb-0 text-start small'
          variant={feedback.ok ? 'success' : 'danger'}
          role={feedback.ok ? 'status' : 'alert'}
        >
          {feedback.message}
        </Alert>
      )}
    </>
  );
}
