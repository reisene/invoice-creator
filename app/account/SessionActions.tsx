'use client';

import * as Sentry from '@sentry/nextjs';
import { useState, useTransition } from 'react';
import { Alert, Button } from 'react-bootstrap';
import {
  revokeAllSessions,
  revokeOtherSessions,
  revokeSessionById,
} from './actions';

type Kind = 'one' | 'others' | 'all';

const CONFIRM: Record<Kind, string> = {
  one: 'Wylogować to urządzenie?',
  others: 'Wylogować ze wszystkich pozostałych urządzeń?',
  all: 'Wylogować ze wszystkich urządzeń, także z tego?',
};

export function SessionActionButton({
  kind,
  sessionId,
  label,
  variant,
  size,
}: {
  kind: Kind;
  sessionId?: string;
  label: string;
  variant: 'outline-danger' | 'outline-secondary';
  size?: 'sm';
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  function handleClick() {
    if (!window.confirm(CONFIRM[kind])) return;
    setFeedback(null);

    startTransition(async () => {
      try {
        const result =
          kind === 'one'
            ? await revokeSessionById(sessionId ?? '')
            : kind === 'others'
              ? await revokeOtherSessions()
              : await revokeAllSessions();
        // Pomyślne wylogowanie ze wszystkich sesji przekierowuje na logowanie.
        setFeedback(result);
      } catch (error) {
        Sentry.withScope((scope) => {
          scope.setTag('error.area', 'account.sessions.revoke');
          Sentry.captureException(error);
        });
        setFeedback({
          ok: false,
          message: 'Wystąpił błąd. Spróbuj ponownie.',
        });
      }
    });
  }

  return (
    <>
      <Button
        type='button'
        size={size}
        variant={variant}
        disabled={pending}
        onClick={handleClick}
      >
        {pending ? 'Wylogowywanie…' : label}
      </Button>
      {feedback && (
        <Alert
          className='mt-2 mb-0 small'
          variant={feedback.ok ? 'success' : 'danger'}
          role={feedback.ok ? 'status' : 'alert'}
        >
          {feedback.message}
        </Alert>
      )}
    </>
  );
}
