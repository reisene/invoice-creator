import CtaBanner from '@/components/Home/CtaBanner';
import Features from '@/components/Home/Features';
import HelpArticlesSection from '@/components/Home/HelpArticlesSection';
import Hero from '@/components/Home/Hero';
import HowItWorks from '@/components/Home/HowItWorks';
import InvoiceContent from '@/components/Home/InvoiceContent';
import { Container } from 'react-bootstrap';

export default function Home() {
  return (
    <Container>
      <Hero />
      <Features />
      <HowItWorks />
      <InvoiceContent />
      <HelpArticlesSection />
      <CtaBanner />
    </Container>
  );
}
