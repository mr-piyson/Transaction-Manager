import type { NextConfig } from "next";
require("./src/lib/env");
const nextConfig: NextConfig = {
  typedRoutes: true,
  productionBrowserSourceMaps: true,
};

export default nextConfig;
