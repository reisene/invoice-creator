'use client';

import { authClient } from '@/lib/auth/client';
import { hasAdminRole } from '@/lib/auth/roles';
import Link from 'next/link';
import {
  Button,
  ButtonGroup,
  ButtonToolbar,
  Dropdown,
  Placeholder,
} from 'react-bootstrap';
import {
  BsBoxArrowInRight,
  BsPersonCircle,
  BsPersonGear,
  BsPersonPlus,
  BsReceipt,
  BsShieldLock,
} from 'react-icons/bs';
import SignOutButton from './SignOutButton';

export default function AuthButtons() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <ButtonToolbar className='gap-2' aria-busy='true' aria-hidden='true'>
        <Placeholder
          as='div'
          className='rounded-3 bg-secondary'
          style={{ width: '110px', height: '38px', opacity: 0.15 }}
        />
        <Placeholder
          as='div'
          className='rounded-3 bg-secondary'
          style={{ width: '105px', height: '38px', opacity: 0.15 }}
        />
      </ButtonToolbar>
    );
  }

  if (session?.user) {
    return (
      <ButtonToolbar className='gap-2'>
        <Dropdown as={ButtonGroup} align='end'>
          <Dropdown.Toggle
            id='account-menu-toggle'
            variant={'primary'}
            className='d-inline-flex align-items-center gap-2'
          >
            <BsPersonCircle aria-hidden />
            Konto
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item
              as={Link}
              href={'/account'}
              className='d-flex align-items-center gap-2'
            >
              <BsPersonGear aria-hidden />
              Edytuj konto
            </Dropdown.Item>
            <Dropdown.Item
              as={Link}
              href={'/account/invoices'}
              className='d-flex align-items-center gap-2'
            >
              <BsReceipt aria-hidden />
              Rachunki i dane stron
            </Dropdown.Item>
            {hasAdminRole(session.user.role) && (
              <>
                <Dropdown.Divider />
                <Dropdown.Item
                  as={Link}
                  href={'/admin'}
                  prefetch={false}
                  className='d-flex align-items-center gap-2'
                >
                  <BsShieldLock aria-hidden />
                  Panel administratora
                </Dropdown.Item>
              </>
            )}
          </Dropdown.Menu>
        </Dropdown>
        <SignOutButton />
      </ButtonToolbar>
    );
  }

  return (
    <ButtonToolbar className='gap-2'>
      <Button
        href={'/auth/sign-up'}
        variant={'outline-primary'}
        className='d-inline-flex align-items-center gap-2'
      >
        <BsPersonPlus aria-hidden />
        Rejestracja
      </Button>
      <Button
        href={'/auth/sign-in'}
        variant={'primary'}
        className='d-inline-flex align-items-center gap-2'
      >
        <BsBoxArrowInRight aria-hidden />
        Logowanie
      </Button>
    </ButtonToolbar>
  );
}
