import {
  getAdjacentArticles,
  getAllHelpArticles,
  getArticleBySlug,
  getCategoryArticles,
} from '@/lib/helpArticles';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ComponentType } from 'react';
import {
  BsArrowLeft,
  BsArrowRight,
  BsBook,
  BsCalculator,
  BsFileEarmarkText,
  BsHouseDoorFill,
} from 'react-icons/bs';

interface HelpSlugPageProps {
  params: Promise<{
    slug: string[];
  }>;
}

export async function generateStaticParams() {
  return getAllHelpArticles().map((article) => ({
    slug: article.slug,
  }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: HelpSlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    return {
      title: 'Artykuł nie został odnaleziony – Pomoc',
    };
  }

  const canonicalUrl = `/help/${article.slugPath}`;

  return {
    title: `${article.title} – Pomoc i Baza Wiedzy`,
    description: article.description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'article',
      locale: 'pl_PL',
      title: `${article.title} – Pomoc i Baza Wiedzy`,
      description: article.description,
      url: canonicalUrl,
    },
  };
}

export default async function HelpSlugPage({ params }: HelpSlugPageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  // Dynamiczny import komponentu MDX
  let MDXContent: ComponentType;
  try {
    const imported = await import(
      `@/content/help/${article.slug.join('/')}.mdx`
    );
    MDXContent = imported.default;
  } catch {
    notFound();
  }

  const { prev, next } = getAdjacentArticles(article.slugPath);
  const categoryArticles = getCategoryArticles(article.category).filter(
    (a) => a.slugPath !== article.slugPath,
  );

  return (
    <div className='container py-4'>
      <div className='row justify-content-center'>
        <div className='col-lg-9 col-xl-8'>
          {/* Breadcrumbs */}
          <nav aria-label='breadcrumb' className='mb-4 small'>
            <ol className='breadcrumb'>
              <li className='breadcrumb-item'>
                <Link href='/' className='text-decoration-none'>
                  <BsHouseDoorFill className='me-1' /> Start
                </Link>
              </li>
              <li className='breadcrumb-item'>
                <Link href={'/help' as never} className='text-decoration-none'>
                  Pomoc
                </Link>
              </li>
              <li className='breadcrumb-item text-body-secondary'>
                {article.categoryLabel}
              </li>
              <li className='breadcrumb-item active' aria-current='page'>
                {article.title}
              </li>
            </ol>
          </nav>

          {/* Nagłówek artykułu */}
          <header className='mb-4'>
            <div className='d-flex align-items-center gap-2 mb-2'>
              <span className='badge bg-primary-subtle text-primary px-2 py-1'>
                {article.categoryLabel}
              </span>
              <span className='text-muted small'>Baza wiedzy</span>
            </div>
            <p className='text-muted fs-5 mb-0'>{article.description}</p>
          </header>

          {/* Treść MDX */}
          <div className='card shadow-sm border border-secondary-subtle rounded-4 mb-5 bg-body'>
            <article className='card-body help-article-container p-4 p-md-5'>
              <MDXContent />
            </article>
          </div>

          {/* Tagi */}
          <div className='d-flex align-items-center gap-2 flex-wrap mb-4 pb-3 border-bottom'>
            <span className='small text-muted'>Tematy powiązane:</span>
            {article.tags.map((tag) => (
              <span
                key={tag}
                className='badge bg-secondary-subtle text-secondary-emphasis border fw-normal'
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Inne artykuły w tej kategorii */}
          {categoryArticles.length > 0 && (
            <div className='card border border-secondary-subtle bg-body-tertiary shadow-sm p-4 rounded-4 mb-5'>
              <h5 className='fw-bold mb-3 d-flex align-items-center gap-2 text-body'>
                <BsBook className='text-primary' /> Pozostałe artykuły w dziale:{' '}
                <span className='text-primary'>{article.categoryLabel}</span>
              </h5>
              <div className='list-group list-group-flush rounded-3'>
                {categoryArticles.map((item) => (
                  <Link
                    key={item.slugPath}
                    href={`/help/${item.slugPath}` as never}
                    className='list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3 border border-secondary-subtle bg-body mb-2 rounded-3 hover-elevate'
                  >
                    <div>
                      <div className='fw-semibold text-body'>{item.title}</div>
                      <div className='small text-muted line-clamp-1'>
                        {item.description}
                      </div>
                    </div>
                    <BsArrowRight className='text-muted flex-shrink-0 ms-2' />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Nawigacja Poprzedni / Następny */}
          <div className='row g-3 mb-5'>
            <div className='col-sm-6'>
              {prev ? (
                <div className='card h-100 border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 p-3 position-relative hover-elevate'>
                  <span className='text-muted small mb-1'>
                    <BsArrowLeft className='me-1' /> Poprzedni artykuł
                  </span>
                  <Link
                    href={`/help/${prev.slugPath}` as never}
                    className='fw-bold text-decoration-none text-body stretched-link'
                  >
                    {prev.title}
                  </Link>
                </div>
              ) : null}
            </div>
            <div className='col-sm-6'>
              {next ? (
                <div className='card h-100 border border-secondary-subtle bg-body-tertiary shadow-sm rounded-4 p-3 text-sm-end position-relative hover-elevate'>
                  <span className='text-muted small mb-1'>
                    Następny artykuł <BsArrowRight className='ms-1' />
                  </span>
                  <Link
                    href={`/help/${next.slugPath}` as never}
                    className='fw-bold text-decoration-none text-body stretched-link'
                  >
                    {next.title}
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          {/* CTA Box */}
          <div className='card border border-secondary-subtle bg-body-tertiary shadow-sm p-4 text-center rounded-4'>
            <div className='card-body'>
              <h5 className='fw-bold mb-2 text-body'>
                Przetestuj swoje wyliczenia
              </h5>
              <p className='text-muted small mb-3'>
                Sprawdź jak składki i podatek wpłyną na Twoją wypłatę w naszym
                darmowym generatorze.
              </p>
              <div className='d-flex justify-content-center gap-2 flex-wrap'>
                <Link href='/generator' className='btn btn-primary btn-sm'>
                  <BsCalculator className='me-1' /> Otwórz generator
                </Link>
                <Link
                  href='/preview'
                  className='btn btn-outline-primary btn-sm'
                >
                  <BsFileEarmarkText className='me-1' /> Zobacz wzorce
                </Link>
                <Link
                  href={'/help' as never}
                  className='btn btn-outline-secondary btn-sm'
                >
                  <BsArrowLeft className='me-1' /> Wszystkie artykuły
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
