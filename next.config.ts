require("./src/lib/env");
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  productionBrowserSourceMaps: true,
  allowedDevOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
};

export default nextConfig;
