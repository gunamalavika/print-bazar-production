import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  async redirects() {
    return [
      { source: '/admin/qc', destination: '/qc/inspection', permanent: true },
      { source: '/qc', destination: '/qc/inspection', permanent: true },
      { source: '/admin/production/job-card/:path*', destination: '/production/job-card/:path*', permanent: true },
      { source: '/admin/production', destination: '/production/queue', permanent: true },
      { source: '/production', destination: '/production/queue', permanent: true },
      { source: '/admin/orders/:path*', destination: '/sales/orders/:path*', permanent: true },
      { source: '/orders/:path*', destination: '/sales/orders/:path*', permanent: true },
      { source: '/admin/orders', destination: '/sales/orders', permanent: true },
      { source: '/orders', destination: '/sales/orders', permanent: true },
      { source: '/sales', destination: '/sales/orders', permanent: true },
      { source: '/admin/artwork', destination: '/prepress/artwork', permanent: true },
      { source: '/artwork', destination: '/prepress/artwork', permanent: true },
      { source: '/prepress', destination: '/prepress/artwork', permanent: true },
      { source: '/admin/packing', destination: '/packing/station', permanent: true },
      { source: '/packing', destination: '/packing/station', permanent: true },
      { source: '/admin/dispatch', destination: '/dispatch/manifest', permanent: true },
      { source: '/dispatch', destination: '/dispatch/manifest', permanent: true },
      { source: '/admin/finance', destination: '/finance/payments', permanent: true },
      { source: '/finance', destination: '/finance/payments', permanent: true },
      { source: '/admin/inventory', destination: '/production/inventory', permanent: true },
      { source: '/inventory', destination: '/production/inventory', permanent: true },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:4000/api/v1/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:4000/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;
