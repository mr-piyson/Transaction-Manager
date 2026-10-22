# Transaction Manager

<p align="center">
  <picture style="width: 500px">
    <source media="(prefers-color-scheme: light)" srcset="/assets/Banner-Light.png" />
    <source media="(prefers-color-scheme: dark)" srcset="/assets/Banner-Dark.png" />
    <img src="/assets/Banner-Dark.png" width="100%" alt="Transaction Manager logo and name" />
  </picture>
</p>

Transaction Manager is a web application that allows users to create Records and manage Transactions. It is built using Next.js

## Technologies Used

![Technologies](https://go-skill-icons.vercel.app/api/icons?i=next,typescript,prisma,react,tailwind,shadcn,jwt,i18n)

## Installation

1. Clone the repository:

```
git clone https://github.com/your-username/transaction-manager.git
```

2. Install dependencies:

```
cd transaction-manager npm install
```

## Usage

1. Start the development server:

```
npm run dev
```

1. Access the application in your browser at `http://localhost:3000`.

## PWA

The app ships as an installable PWA: it can be added to the home screen on
Android, iOS and desktop, and it keeps working (with an offline notice) when
the network drops.

| Piece | Location |
| --- | --- |
| Web App Manifest | `app/manifest.ts` → `/manifest.webmanifest` |
| Service worker | `public/sw.js` (scope `/`) |
| Registration + update flow | `components/pwa/service-worker-registration.tsx` |
| "Add to home screen" banner | `components/pwa/install-prompt.tsx` |
| Offline fallback page | `public/offline.html` |
| Icons & iOS launch images | `public/icons/` |
| Icon generator | `scripts/generate-icons.mjs` |

### Caching policy

The service worker is deliberately conservative because this is a financial ERP:

- **Navigations** — network-first with a 5s timeout, then the precached
  `/offline.html` page. Page HTML is never written to the cache: it contains
  user-specific financial data and the app is often used on shared terminals.
- **`/_next/static/*`** — cache-first. Filenames are content-hashed, so a
  cached entry can never go stale.
- **Icons / fonts** — stale-while-revalidate.
- **`/api/*` (tRPC, uploads)** — never cached, so the app can never display a
  stale balance.

The offline page is a standalone HTML file rather than a Next.js route on
purpose: serving a Next.js document for a *different* URL makes the client
router request the target route's chunks, which fails offline and shows an
application error instead of the offline notice.

Signing out clears every cache this app owns (`lib/pwa.ts`).

### Working on the PWA

The service worker is **disabled in `next dev`** — it would fight with hot
module replacement. To test the install/offline flow locally, either run a
production build (`bun run build && bun run start`) or opt in explicitly:

```
NEXT_PUBLIC_PWA_DEV=true bun run dev
```

Regenerate the icon set after changing `assets/logo.png`:

```
bun run icons
```

Run the service worker tests after changing `public/sw.js`:

```
bun run test:sw
```

### Environment

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public origin of the app. Used for absolute metadata URLs. Falls back to `BETTER_AUTH_URL`. |

## Contributing

Contributions are welcome! If you have any ideas, suggestions, or bug reports, please open an issue or submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).

