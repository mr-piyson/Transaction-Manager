#!/usr/bin/env node
//
// generate-icons.mjs — build the PWA icon set from assets/logo.png.
//
// Produces (all in public/icons/):
//   icon-192.png / icon-512.png             purpose "any"     (full-bleed brand bg)
//   icon-maskable-192.png / -512.png        purpose "maskable" (logo inside the 80% safe zone)
//   apple-touch-icon.png                    180x180, opaque (iOS home screen)
//   apple-splash-*.jpg                      iOS launch images (portrait)
//
// The logo is a transparent PNG, so every icon is composited onto an opaque
// brand background. iOS refuses to mask transparent PNGs, which is why the
// apple-touch-icon is flattened rather than reusing the raw logo.
//
// Usage: node scripts/generate-icons.mjs

import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "assets", "logo.png");
const OUT_DIR = join(ROOT, "public", "icons");

// Brand colours mirrored from app/globals.css (--primary light / --primary dark).
const BRAND_BG = "#2c2742";

/**
 * @param {number} size    output edge length in px
 * @param {number} scale   logo size as a fraction of the canvas
 */
async function renderIcon(size, scale) {
  const logoSize = Math.round(size * scale);
  const logo = await sharp(SOURCE)
    .resize(logoSize, logoSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BRAND_BG,
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * iOS launch image. The logo is sized relative to the *shorter* edge so it
 * looks identical across the very different device resolutions.
 */
async function renderSplash(width, height) {
  const logoSize = Math.round(Math.min(width, height) * 0.32);
  const logo = await sharp(SOURCE)
    .resize(logoSize, logoSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: BRAND_BG,
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const targets = [
    // "any" icons: the logo fills most of the tile.
    { file: "icon-192.png", size: 192, scale: 0.72 },
    { file: "icon-512.png", size: 512, scale: 0.72 },
    // Maskable icons: Android may crop to any shape, so the logo has to stay
    // inside the 80% safe zone (circle inscribed in the canvas).
    { file: "icon-maskable-192.png", size: 192, scale: 0.52 },
    { file: "icon-maskable-512.png", size: 512, scale: 0.52 },
    // iOS home screen icon.
    { file: "apple-touch-icon.png", size: 180, scale: 0.72 },
  ];

  for (const { file, size, scale } of targets) {
    const buf = await renderIcon(size, scale);
    await sharp(buf).toFile(join(OUT_DIR, file));
    console.log(`✓ ${file} (${size}x${size})`);
  }

  // iOS launch images (portrait). Without these Safari shows a white screen
  // while the app boots, which looks broken next to a branded home screen
  // icon. Device pixel ratios are matched by the `media` attribute of the
  // apple-touch-startup-image <link> tags in the root layout.
  const splashes = [
    { file: "apple-splash-640x1136.jpg", width: 640, height: 1136 }, // iPhone SE
    { file: "apple-splash-750x1334.jpg", width: 750, height: 1334 }, // iPhone 8 / SE 2 / SE 3
    { file: "apple-splash-828x1792.jpg", width: 828, height: 1792 }, // iPhone XR / 11
    { file: "apple-splash-1125x2436.jpg", width: 1125, height: 2436 }, // iPhone X / XS / 11 Pro
    { file: "apple-splash-1242x2688.jpg", width: 1242, height: 2688 }, // iPhone XS Max / 11 Pro Max
    { file: "apple-splash-1284x2778.jpg", width: 1284, height: 2778 }, // iPhone 12/13/14 Pro Max
    { file: "apple-splash-1536x2048.jpg", width: 1536, height: 2048 }, // iPad 9.7"
  ];

  for (const { file, width, height } of splashes) {
    const buf = await renderSplash(width, height);
    await sharp(buf).toFile(join(OUT_DIR, file));
    console.log(`✓ ${file} (${width}x${height})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
