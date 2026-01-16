/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  // Note: serverExternalPackages is not available in Next.js 14.2
  // Playwright is handled via webpack config below
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

