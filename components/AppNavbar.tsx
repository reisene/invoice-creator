'use client';

import { Fira_Mono } from 'next/font/google';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
    label: 'Home',
    icon: BsFillHousesFill,
  },
  {
    href: '/generator',
    label: 'Generator',
    icon: BsCalculatorFill,
  },
  {
    href: '/preview',
    label: 'Preview',
    icon: BsFillFileEarmarkTextFill,
  },
  {
    href: '/help',
    label: 'Help',
    icon: BsQuestionCircleFill,
  },
  {
    href: '/contact',
    label: 'Contact',
    icon: BsEnvelopeFill,
  },
];

export default function AppNavbar() {
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
          className={'d-flex align-items-center'}
        >
          Invoice Creator
        </Navbar.Brand>
        <Nav variant={'underline'} className={'ms-auto'}>
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
                >
                  {isActive && <Icon aria-hidden={true} className={'me-2'} />}

                  {link.label}
                </Nav.Link>
              </Nav.Item>
            );
          })}
        </Nav>
      </Container>
    </Navbar>
  );
}
