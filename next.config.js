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

    const existingExternals = config.externals;
    const normalizedExternals = Array.isArray(existingExternals)
      ? existingExternals
      : existingExternals
        ? [existingExternals]
        : [];

    normalizedExternals.push('canvas');
    normalizedExternals.push(({ request }, callback) => {
      if (request === '@adobe/pdfservices-node-sdk') {
        return callback(null, 'commonjs @adobe/pdfservices-node-sdk');
      }

      return callback();
    });

    config.externals = normalizedExternals;

    return config;
  },
}

export default nextConfig;