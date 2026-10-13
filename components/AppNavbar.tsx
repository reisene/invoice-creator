'use client';

import { Fira_Mono } from 'next/font/google';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Container, Nav, Navbar } from 'react-bootstrap';
import { IconType } from 'react-icons';
import {
  BsCalculatorFill,
  BsEnvelopeFill,
  BsFillFileEarmarkTextFill,
  BsFillHousesFill,
  BsQuestionCircleFill,
} from 'react-icons/bs';

const mono = Fira_Mono({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
});

const navLinks: {
  href: string;
  label: string;
  icon: IconType;
}[] = [
  {
    href: '/',
    label: 'Start',
    icon: BsFillHousesFill,
  },
  {
    href: '/generator',
    label: 'Generator',
    icon: BsCalculatorFill,
  },
  {
    href: '/preview',
    label: 'Wzory',
    icon: BsFillFileEarmarkTextFill,
  },
  {
    href: '/help',
    label: 'Pomoc',
    icon: BsQuestionCircleFill,
  },
  {
    href: '/contact',
    label: 'Kontakt',
    icon: BsEnvelopeFill,
  },
];

export default function AppNavbar({ authButtons }: { authButtons: ReactNode }) {
  const pathname = usePathname();
  const isLinkActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <Navbar
      expand={'lg'}
      sticky={'top'}
      bg={'body-tertiary'}
      className={mono.className}
    >
      <Container>
        <Navbar.Brand
          as={Link}
          href={'/'}
          className={'d-flex align-items-center fw-bold'}
        >
          Invoice Creator
        </Navbar.Brand>
        <Navbar.Toggle aria-controls='main-navbar-nav' />
        <Navbar.Collapse id='main-navbar-nav'>
          <Nav
            variant={'underline'}
            className={'ms-auto align-items-lg-center'}
          >
            {navLinks.map((link) => {
              const isActive: boolean = isLinkActive(link.href);
              const Icon: IconType = link.icon;

              return (
                <Nav.Item key={link.href}>
                  <Nav.Link
                    as={Link}
                    href={link.href}
                    active={isActive}
                    aria-current={isActive ? 'page' : undefined}
                    className='d-inline-flex align-items-center'
                  >
                    <Icon aria-hidden={true} className={'me-2'} />
                    {link.label}
                  </Nav.Link>
                </Nav.Item>
              );
            })}
          </Nav>
          <div className='ms-lg-3 mt-3 mt-lg-0'>{authButtons}</div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
