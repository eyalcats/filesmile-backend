import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Hardcode basePath for production builds (served at /scanner via reverse proxy)
const basePath = '/scanner';

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  // Base path for serving behind reverse proxy at /scanner
  basePath,
};

export default withNextIntl(nextConfig);
