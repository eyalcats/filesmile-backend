import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  // Base path for serving behind reverse proxy at /scanner
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
};

export default withNextIntl(nextConfig);
