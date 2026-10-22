import type { MetadataRoute } from "next";

/**
 * Web App Manifest — served at /manifest.webmanifest.
 *
 * Next.js links it automatically from the root layout. Keep the `id` stable:
 * the browser uses it to recognise updates of the same installed app instead
 * of treating them as a different one.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Transaction Manager",
    short_name: "Transaction Manager",
    description:
      "Best CRM system for your business to manage transactions, invoices, stock and reports.",
    lang: "en",
    dir: "ltr",
    start_url: "/erp",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: "any",
    theme_color: "#2c2742",
    background_color: "#2c2742",
    categories: ["business", "productivity", "finance"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    // Long-press shortcuts on the installed app icon.
    shortcuts: [
      {
        name: "New Invoice",
        short_name: "Invoice",
        description: "Create a new invoice",
        url: "/erp/documents/invoices/new",
      },
      {
        name: "Customers",
        short_name: "Customers",
        description: "Browse customers",
        url: "/erp/customers",
      },
      {
        name: "Reports",
        short_name: "Reports",
        description: "Financial reports and analytics",
        url: "/erp/reports",
      },
    ],
  };
}
