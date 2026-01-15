import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Base path for production (served at /scanner via reverse proxy)
// Set to empty string for local development, '/scanner' for production
const basePath = process.env.NODE_ENV === 'production' ? '/scanner' : '';

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  // Base path for serving behind reverse proxy at /scanner
  basePath,
};

export default withNextIntl(nextConfig);
