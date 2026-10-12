import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
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

export default nextConfig;
