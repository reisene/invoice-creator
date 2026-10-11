'use client';

import type { ComponentProps } from 'react';
import { Button } from 'react-bootstrap';

export default function ConfirmButton({
  confirmMessage,
  ...props
}: ComponentProps<typeof Button> & { confirmMessage: string }) {
  return (
    <Button
      type='submit'
      {...props}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
    />
  );
}
