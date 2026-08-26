//@ts-check

const { composePlugins, withNx } = require('@nx/next');

const fathomHostname = normalizeHostname(
  process.env.NEXT_PUBLIC_FATHOM_CUSTOM_DOMAIN ?? 'cdn.usefathom.com',
);
const fathomOrigin = `https://${fathomHostname}`;
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  `connect-src 'self' ${fathomOrigin} https://api.usefathom.com`,
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "img-src 'self' data:",
  "manifest-src 'self'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline' ${fathomOrigin}`,
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
  'upgrade-insecure-requests',
].join('; ');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  allowedDevOrigins: ['chakra-docs.test'],
  nx: {},
  outputFileTracingIncludes: {
    '/api/docs/search': ['src/content/docs/**/*'],
  },
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);

function normalizeHostname(value) {
  const hostname = value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');

  if (!/^[a-z0-9.-]+(?::\d+)?$/i.test(hostname)) {
    throw new Error(
      'NEXT_PUBLIC_FATHOM_CUSTOM_DOMAIN must be a hostname without a path.',
    );
  }

  return hostname;
}
