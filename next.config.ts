import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use standalone output for Docker deployments
  output: "standalone",

  // Disable X-Powered-By header
  poweredByHeader: false,

  reactStrictMode: true,

  // Security headers for production
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://telegram.org https://oauth.telegram.org https://mc.yandex.ru",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' data:",
              "connect-src 'self' https://oauth.telegram.org",
              "frame-src https://web.telegram.org https://oauth.telegram.org",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
      {
        // Cache images
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mc.yandex.ru",
      },
      {
        protocol: "https",
        hostname: "telegram.org",
      },
      {
        protocol: "https",
        hostname: "avatars.yandex.net",
      },
    ],
  },
};

export default nextConfig;
