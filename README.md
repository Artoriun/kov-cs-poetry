# Kovács — Modern Poetry Portfolio

A responsive, bilingual (Hungarian/English) poetry portfolio built with **React**, **TypeScript**, **Vite**, **Motion**, and custom **CSS**. Elegant typography, immersive image overlays, an auto-advancing carousel, a full-screen swipeable poem reader, and a Firestore-backed admin portal — optimized for desktop and mobile.

**Live demo:** https://artoriun.github.io/kov-cs-poetry/

<img width="1511" height="729" alt="Screenshot 2026-07-01 at 19 03 43" src="https://github.com/user-attachments/assets/309af18e-225e-4bd6-a0da-be411f6d72d1" />

---

## Features

**Public site**
- Home carousel of featured poems — auto-advances by line count, swipeable, with sequenced mask-wipe text reveals
- Paginated poems grid with a scroll-tracking table of contents
- Full-screen poem reader — vertical swipe between pages, staggered line reveals, dedicated landscape layout
- Light/dark mode, page-load fade-in sequence, fully responsive (portrait & landscape)

**Admin portal (`/admin`)** — password login + JWT auth (auto-logout on expiry)
- Create, edit, delete, and drag-to-reorder poems; changes persist to Firestore and reflect site-wide instantly
- **List** view (full edit cards) and **Order** view (drag-to-reorder preview grid, mobile touch support)
- Feature poems for the home carousel; upload background images to Cloudinary
- **Custom Slides** — manually split a poem into reader pages, pre-filled from an automatic layout measurement

---

## Internationalization

All UI text lives in typed locale files (`packages/web/src/i18n/{en,hu}.ts`) behind a lightweight `LanguageProvider` + `useT()` hook — no i18n dependency. `hu.ts` is type-checked against the `en` shape, so a missing key is a build error. Language comes from the `?lang=` query param, defaulting to **Hungarian** (`VITE_DEFAULT_LANG`); the choice is not persisted, so a refresh always reverts to Hungarian unless `?lang=` is present. Poem content and the *Kovács* / *Admin* labels are left as authored. To add a string, add the key to both locale files and use `t.<key>`.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **React** + **TypeScript** + **Vite** | UI, type safety, build & dev server |
| **TurboRepo** | Monorepo build orchestration |
| **React Router** | Client-side routing |
| **Motion** (`motion/react`) | Declarative animations (`AnimatePresence`, `layout`, variants) |
| **Express** | Admin API backend (`packages/api`) |
| **Firebase Firestore** | Poem overrides & display order |
| **Cloudinary** | Image upload & hosting |
| **JWT** | Admin authentication |
| **Biome** | Linting & formatting (one tool, replaces ESLint + Prettier) |

---

## Project Structure

```
packages/
├── shared/src/index.ts         # Poem type + hardcoded fallback data
├── api/src/                    # Express server (port 4000)
│   ├── index.ts
│   ├── routes/                 # auth.ts, poems.ts
│   └── middleware/requireAuth.ts
└── web/src/                    # Vite React app (port 3000)
    ├── App.tsx                 # Routes + PoemsProvider
    ├── context/                # PoemsContext, ThemeContext
    ├── i18n/                   # en.ts, hu.ts, LanguageProvider
    ├── lib/api.ts              # Typed API client
    ├── components/             # Header, PoemCarousel, ThemeToggle, …
    ├── pages/                  # Home, Poems, Admin, Contact
    └── styles/                 # global.css, themes.css, admin.css
```

---

## Quick Start

```bash
npm install        # install dependencies
npm run dev        # web (:3000) + API (:4000)
npm run build      # production build
npm run typecheck  # tsc across all packages (via Turbo)
npm run lint       # Biome linter
npm run format     # Biome auto-format
npm run check      # lint + format verification (CI)
```

Vite proxies `/api` to the API in development. Linting/formatting use **[Biome](https://biomejs.dev)** (config in `biome.json`); type-checking is each package's `typecheck` script, orchestrated by Turbo.

---

## Deployment

- **Frontend → GitHub Pages** via `.github/workflows/deploy.yml` (triggers on push to `main`).
- **API → Render** (free tier). Set `CORS_ORIGIN` (`https://<your-username>.github.io`) on Render, and add the deployed API URL as the `VITE_API_URL` GitHub Actions secret so the Pages build can reach it.
  - Build: `npm install && cd packages/api && npm run build` — Start: `node packages/api/dist/index.js`
  - Optional safety step: use `npm run typecheck && npm run build` as the build command so a type error can't deploy (the API package type-checks via `typecheck`; there is no per-package `lint` — Biome linting runs from the repo root).

---

## Environment Variables

Create `packages/api/.env` for local development:

```env
ADMIN_PASSWORD="your-password"
JWT_SECRET=your-jwt-secret
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
CLOUDINARY_URL="cloudinary://api_key:api_secret@cloud_name"
```

For the Pages build, set `VITE_API_URL` as a repository secret. Without it, the frontend falls back to relative `/api` paths (local dev behind the Vite proxy).

---

## Managing Poems

Poems live in `packages/shared/src/index.ts` as a hardcoded fallback; admin-portal edits (title, text, image, order, featured, deletion) are stored in Firestore and take precedence at runtime. Create and edit poems from the admin portal — no code changes required.

To add a fallback poem, append to `POEMS`:

```typescript
{ id: "poem-6", title: "Title", image: "https://res.cloudinary.com/.../image.jpg", overlay: "Line one\nLine two" }
```

`overlay` is newline-separated text shown over the image. Two optional Firestore-only fields drive the custom-slides reader layout and are written only by the admin portal: `customSlides` (`string[]`, per-slide text) and `customSlidesEnabled` (`boolean`).

---

## Theming

Edit colours in `packages/web/src/styles/themes.css` via CSS custom properties (`--bg-primary`, `--text-primary`, `--header-bg`, …). Light mode is under `:root`; dark mode overrides under `html.dark-mode`.
