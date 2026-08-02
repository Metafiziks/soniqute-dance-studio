import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Serve the layers folder as static assets at /layers/
  async rewrites() {
    return [
      {
        source: "/layers/:path*",
        destination: "/api/static/:path*",
      },
    ];
  },
};

export default nextConfig;
