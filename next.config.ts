import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use standalone output for Docker deployments
  output: "standalone",
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  reactStrictMode: false,
  
  // Security headers for production
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
    ];
  },
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
