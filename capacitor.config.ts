import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.muntadherateeq.app",
  appName: "ITSM",
  webDir: ".next/server/app", // Point to the default Next.js SSR output
  server: {
    url: "", // Your deployed Vercel URL
    cleartext: true,
    androidScheme: "https",
  },
};

export default config;
