/** @type {import('next').NextConfig} */
const nextConfig = {
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
        { key: 'CDN-Cache-Control', value: 'no-store' },
        { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
      ],
    },
    {
      source: '/plan/:path*',
      headers: [
        { key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
        { key: 'CDN-Cache-Control', value: 'no-store' },
        { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
      ],
    },
  ],
}

module.exports = nextConfig
