'use client';

import { HELP_CATEGORIES, type HelpArticleMeta } from '@/types/help';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  InputGroup,
  Nav,
  Row,
} from 'react-bootstrap';
import {
  BsArrowRight,
  BsFileText,
  BsLaptop,
  BsPercent,
  BsSearch,
  BsShieldCheck,
  BsXCircle,
} from 'react-icons/bs';

const categoryIcons = {
  podstawy: BsFileText,
  zus: BsShieldCheck,
  podatki: BsPercent,
  aplikacja: BsLaptop,
};

interface HelpIndexClientProps {
  articles: HelpArticleMeta[];
}

function HelpIndexInner({ articles }: HelpIndexClientProps) {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') ?? 'all';
  const [selectedCategory, setSelectedCategory] =
    useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const matchesCategory =
        selectedCategory === 'all' || article.category === selectedCategory;

      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const inTitle = article.title.toLowerCase().includes(q);
      const inDesc = article.description.toLowerCase().includes(q);
      const inTags = article.tags.some((tag) => tag.toLowerCase().includes(q));

      return inTitle || inDesc || inTags;
    });
  }, [articles, selectedCategory, searchQuery]);

  return (
    <Container className='py-4'>
      {/* Nagłówek */}
      <div className='text-center mb-5'>
        <h1 className='fw-bold mb-3'>Baza wiedzy i pomoc</h1>
        <p className='lead text-muted mx-auto' style={{ maxWidth: 680 }}>
          Odpowiedzi na najczęstsze pytania o rozliczanie umów zlecenia, składki
          ZUS, zasady podatkowe oraz obsługę generatora rachunków.
        </p>

        {/* Wyszukiwarka */}
        <Row className='justify-content-center mt-4'>
          <Col md={8} lg={6}>
            <InputGroup size='lg' className='shadow-sm'>
              <InputGroup.Text>
                <BsSearch className='text-muted' />
              </InputGroup.Text>
              <Form.Control
                type='search'
                placeholder='Szukaj (np. student, PIT-2, KUP, minimalna)...'
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                className='border-start-0'
              />
              {searchQuery && (
                <Button
                  variant='outline-secondary'
                  onClick={() => {
                    setSearchQuery('');
                  }}
                  aria-label='Wyczyść wyszukiwanie'
                >
                  <BsXCircle />
                </Button>
              )}
            </InputGroup>
          </Col>
        </Row>
      </div>

      {/* Kafelki / Nawigacja kategorii */}
      <Nav
        variant='pills'
        className='justify-content-center gap-2 mb-4 flex-wrap'
      >
        <Nav.Item>
          <Button
            variant={
              selectedCategory === 'all' ? 'primary' : 'outline-secondary'
            }
            onClick={() => {
              setSelectedCategory('all');
            }}
            size='sm'
            className='rounded-pill px-3'
          >
            Wszystkie ({articles.length})
          </Button>
        </Nav.Item>
        {HELP_CATEGORIES.map((cat) => {
          const Icon = categoryIcons[cat.id];
          const count = articles.filter((a) => a.category === cat.id).length;
          const isActive = selectedCategory === cat.id;
          return (
            <Nav.Item key={cat.id}>
              <Button
                variant={isActive ? 'primary' : 'outline-secondary'}
                onClick={() => {
                  setSelectedCategory(cat.id);
                }}
                size='sm'
                className='rounded-pill px-3 d-inline-flex align-items-center gap-2'
              >
                <Icon />
                <span>{cat.name}</span>
                <Badge
                  bg={isActive ? 'light' : 'secondary-subtle'}
                  text={isActive ? 'dark' : 'secondary-emphasis'}
                >
                  {count}
                </Badge>
              </Button>
            </Nav.Item>
          );
        })}
      </Nav>

      {/* Lista artykułów */}
      {filteredArticles.length === 0 ? (
        <Card className='text-center py-5 shadow-sm border border-secondary-subtle bg-body-tertiary my-4 rounded-4'>
          <Card.Body>
            <p className='fs-5 text-muted mb-3'>
              Nie znaleziono artykułów pasujących do wpisanego hasła.
            </p>
            <Button
              variant='outline-primary'
              size='sm'
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
            >
              Wyczyść filtry
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Row className='g-4'>
          {filteredArticles.map((article: HelpArticleMeta) => {
            const Icon = categoryIcons[article.category];
            return (
              <Col md={6} key={article.slugPath}>
                <Card className='h-100 shadow-sm border border-secondary-subtle bg-body-tertiary rounded-4 hover-elevate'>
                  <Card.Body className='d-flex flex-column p-4'>
                    <div className='d-flex align-items-center justify-content-between mb-3'>
                      <Badge
                        bg='primary-subtle'
                        text='primary-emphasis'
                        className='border border-primary-subtle d-inline-flex align-items-center'
                      >
                        <Icon className='me-1 text-primary' />
                        {article.categoryLabel}
                      </Badge>
                    </div>

                    <h5 className='fw-bold mb-2'>
                      <Link
                        href={`/help/${article.slugPath}` as never}
                        className='text-body text-decoration-none stretched-link'
                      >
                        {article.title}
                      </Link>
                    </h5>

                    <p className='text-muted small mb-3 flex-grow-1'>
                      {article.description}
                    </p>

                    <div className='d-flex flex-wrap gap-1 mt-auto pt-3 border-top'>
                      {article.tags.map((tag) => (
                        <Badge
                          key={tag}
                          bg='secondary-subtle'
                          text='secondary-emphasis'
                          className='fw-normal'
                        >
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Dolny baner pomocniczy */}
      <Card className='border border-secondary-subtle bg-body-tertiary shadow-sm mt-5 p-4 text-center rounded-4'>
        <Card.Body>
          <h4 className='fw-bold mb-2 text-body'>
            Potrzebujesz wystawić rachunek?
          </h4>
          <p className='text-muted mb-4'>
            Przejdź do naszego darmowego generatora lub przejrzyj gotowe wzorce
            dla studentów i etatowców.
          </p>
          <div className='d-flex justify-content-center gap-3 flex-wrap'>
            <Link href='/generator' className='btn btn-primary'>
              Otwórz generator <BsArrowRight className='ms-1' />
            </Link>
            <Link href='/preview' className='btn btn-outline-primary'>
              Zobacz wzorce rachunków
            </Link>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default function HelpIndexClient({ articles }: HelpIndexClientProps) {
  return (
    <Suspense>
      <HelpIndexInner articles={articles} />
    </Suspense>
  );
}
