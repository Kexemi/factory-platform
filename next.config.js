/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: { serverActions: { bodySizeLimit: '5mb' } },
  serverExternalPackages: ['twilio', 'stripe', 'openai', 'posthog-node'],
};

module.exports = nextConfig;
