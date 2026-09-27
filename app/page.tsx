import Hero from '@/components/Home/Hero';
import HowItWorks from '@/components/Home/HowItWorks';
import InvoiceContent from '@/components/Home/InvoiceContent';
import Tools from '@/components/Home/Tools';
import { Container } from 'react-bootstrap';

export default function Home() {
  return (
    <Container>
      <Hero />
      <HowItWorks />
      <Tools />
      <InvoiceContent />
    </Container>
  );
}
