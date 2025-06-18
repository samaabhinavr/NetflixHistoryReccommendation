/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        bufferutil: false,
        'utf-8-validate': false,
      };
    }
    return config;
  },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  output: 'standalone',
  poweredByHeader: false,
  // Disable minification to avoid chunk issues
  swcMinify: false,
  // Disable experimental features
  experimental: {
    esmExternals: false,
  },
};

module.exports = nextConfig;
