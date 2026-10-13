import createMDX from '@next/mdx';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  typedRoutes: true,
  turbopack: {
    rules: {
      '*.woff': {
        type: 'asset',
      },
    },
  },
  experimental: {
    useTypeScriptCli: true,
  },
};

const withMDX = createMDX({
  options: {
    remarkPlugins: [
      'remark-gfm',
      'remark-frontmatter',
      ['remark-mdx-frontmatter', { name: 'metadata' }],
    ],
    rehypePlugins: [],
  },
});

export default withMDX(nextConfig);
