/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'cdn.rekaman.io' },
    ],
  },
  async redirects() {
    return [
      // Quick links from rekaman.io/demo → live demo page
      { source: '/demo', destination: 'https://demo.rekaman.io/oslo-sofa.html', permanent: false },
      // rekaman.io/onboard → Google Form lead-capture (Brand Onboarding form).
      // Memorable URL for in-person Coimbatore demos + cold emails + business
      // cards. 307 (permanent:false) deliberately — keeps flexibility to swap
      // the destination to a custom intake page later without browsers caching
      // the old target. Same pattern as /demo above.
      { source: '/onboard', destination: 'https://forms.gle/3wvN7VqY2Czy7wKe7', permanent: false },
      { source: '/docs', destination: 'https://docs.rekaman.io', permanent: false }, // 404 until Phase 2 — intentional
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
