import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';
import type { ComponentProps } from 'react';
import { BsInfoCircleFill } from 'react-icons/bs';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children, ...props }) => (
      <h1 className='h2 fw-bold mb-4' {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 className='h4 fw-bold mt-4 mb-3 pb-2 border-bottom' {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 className='h5 fw-semibold mt-3 mb-2' {...props}>
        {children}
      </h3>
    ),
    p: ({ children, ...props }) => <p {...props}>{children}</p>,
    ul: ({ children, ...props }) => <ul {...props}>{children}</ul>,
    ol: ({ children, ...props }) => <ol {...props}>{children}</ol>,
    li: ({ children, ...props }) => <li {...props}>{children}</li>,
    blockquote: ({ children, ...props }) => (
      <div className='help-callout' role='note' {...props}>
        <div className='d-flex align-items-start gap-2'>
          <BsInfoCircleFill className='text-primary mt-1 flex-shrink-0' />
          <div>{children}</div>
        </div>
      </div>
    ),
    table: ({ children, ...props }) => (
      <div className='table-responsive help-table-wrapper'>
        <table className='table table-hover mb-0 align-middle' {...props}>
          {children}
        </table>
      </div>
    ),
    hr: (props) => <hr {...props} />,
    a: ({ href = '', children, ...props }: ComponentProps<'a'>) => {
      const isInternal = href.startsWith('/') || href.startsWith('#');
      const className =
        'text-primary fw-medium text-decoration-underline link-offset-2';
      if (isInternal) {
        return (
          <Link href={href as never} className={className} {...props}>
            {children}
          </Link>
        );
      }
      return (
        <a
          href={href}
          target='_blank'
          rel='noopener noreferrer'
          className={className}
          {...props}
        >
          {children}
        </a>
      );
    },
    ...components,
  };
}
