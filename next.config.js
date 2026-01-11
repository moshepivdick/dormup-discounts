/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  // Exclude playwright packages from server-side bundling
  serverExternalPackages: ['playwright', '@playwright/browser-chromium'],
  webpack: (config, { isServer }) => {
    // Exclude playwright from client-side bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        playwright: false,
      };
    }
    // Mark playwright as external for server-side to avoid bundling issues
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('playwright');
    }
    return config;
  },
};

module.exports = nextConfig;

