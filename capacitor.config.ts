import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.muntadherateeq.app",
  appName: "transaction-manager",
  webDir: ".next/server/app", // Point to the default Next.js SSR output
  server: {
    url: "https://transaction-manager-three.vercel.app/", // Your deployed Vercel URL
    cleartext: true,
    androidScheme: "https",
  },
};

export default config;
