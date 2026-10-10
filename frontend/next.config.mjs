import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Single root-level .env shared with every backend service.
dotenv.config({ path: path.resolve(dirname, '../.env'), quiet: true });

const gateway = process.env.API_GATEWAY_URL || 'http://localhost:8080';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  // In Docker, nginx routes /api/* before requests ever reach Next.js.
  // With `npm run dev`, this rewrite forwards /api/* to the gateway instead.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${gateway}/api/:path*` }];
  },
};

export default nextConfig;
