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
    config.externals = [...config.externals, 'canvas'];
    return config;
  },
}

module.exports = nextConfig