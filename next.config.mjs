/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prisma client needs native binaries — keep it outside the webpack bundle
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
}

export default nextConfig
