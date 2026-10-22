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
  async headers() {
    return [
      {
        // The service worker must never be served from a stale HTTP cache,
        // otherwise an updated worker (and its new cache version) would never
        // reach the browser.
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          // Explicitly allow the worker to control the whole origin.
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        // The manifest changes whenever the app is rebranded or new shortcuts
        // are added, so it is revalidated on every load.
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/icons/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // The offline page is precached by the service worker.
        source: "/offline.html",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
