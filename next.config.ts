import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // typedRoutes: true,
  output: "standalone",
  // Skip TypeScript type-checking during production build
  typescript: {
    ignoreBuildErrors: true,
  },
  /* config options here */
  allowedDevOrigins: ["*.*.*.*"],
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/uploads/:path*", destination: "/api/files/:path*" },
      ],
    };
  },
};

export default nextConfig;
