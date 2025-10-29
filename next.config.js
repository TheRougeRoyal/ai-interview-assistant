import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  experimental: {
    // Enable newer experimental features as needed
  },
  // Webpack config for PDF.js
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    const externals = Array.isArray(config.externals) ? config.externals : [];
    config.externals = [
      ...externals,
      'canvas',
      'commonjs @adobe/pdfservices-node-sdk',
    ];
    return config;
  },
}

export default nextConfig;