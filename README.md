# Kovács — Modern Poetry Portfolio

Bilingual (Hungarian/English) poetry portfolio: **React**, **TypeScript**, **Vite** and **Motion** in a **TurboRepo** monorepo, with an **Express** + **Firestore** admin portal. Swipeable full-screen poem reader, auto-advancing carousel, working contact form, WCAG AA contrast, and CI that gates every deploy on **Playwright** layout tests.

**Live demo:** https://artoriun.github.io/kov-cs-poetry/

<img width="1511" height="729" alt="Screenshot 2026-07-01 at 19 03 43" src="https://github.com/user-attachments/assets/309af18e-225e-4bd6-a0da-be411f6d72d1" />

---

## Features

**Public site**
- Home carousel of featured poems — auto-advances by line count, swipeable, with sequenced mask-wipe text reveals
- Paginated poems grid with a scroll-tracking table of contents
- Full-screen poem reader — vertical swipe between pages, staggered line reveals, dedicated landscape layout
- Poem text set flush left in a centred block — carousel, grid cards and reader alike
- Working contact form — messages are delivered by email, with validation, a honeypot and per-IP rate limiting
- Light/dark mode, page-load fade-in sequence, fully responsive (portrait & landscape)
- Text colours meet WCAG AA contrast in both themes

**Admin portal (`/admin`)** — password login + JWT auth (auto-logout on expiry)
- Create, edit, delete, and drag-to-reorder poems; changes persist to Firestore and reflect site-wide instantly
- **List** view (full edit cards) and **Order** view (drag-to-reorder preview grid, mobile touch support)
- Feature poems for the home carousel; upload background images to Cloudinary
- **Custom Slides** — manually split a poem into reader pages, pre-filled from an automatic layout measurement
- Runs in English by default, with an EN/HU switch that affects the portal only

---

## Internationalization

All UI text lives in typed locale files (`packages/web/src/i18n/{en,hu}.ts`) behind a lightweight `LanguageProvider` + `useT()` hook — no i18n dependency. `hu.ts` is type-checked against the `en` shape, so a missing key is a build error. Language comes from the `?lang=` query param, defaulting to **Hungarian** (`VITE_DEFAULT_LANG`); the choice is not persisted, so a refresh always reverts to the default unless `?lang=` is present. Poem content and the *Kovács* / *Admin* labels are left as authored.

The **admin portal defaults to English** while the public site stays Hungarian. A second `LanguageProvider` wraps only the `/admin` route (`defaultLang="en" scoped`), so the two are independent: the EN/HU switch in the portal cannot change the public pages, and leaving `/admin` unmounts that provider rather than leaving a language behind. The scoped provider deliberately does not set `document.lang` or `document.title` — React runs child effects before parent ones, so on a direct load of `/admin` the root provider would overwrite it. To add a string, add the key to both locale files and use `t.<key>`.

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
| **Resend** / **Nodemailer** | Contact-form delivery over HTTPS, with SMTP as a local fallback |
| **Biome** | Linting & formatting (one tool, replaces ESLint + Prettier) |
| **Playwright** | Layout regression tests across desktop and mobile viewports |

---

## Project Structure

```
.nvmrc                          # Node 22 — required, see Deployment
playwright.config.ts            # 3 viewport projects
render.yaml                     # API infrastructure as code
e2e/                            # layout.spec.ts + API-stubbing fixtures
packages/
├── shared/src/index.ts         # Poem type + hardcoded fallback data
├── api/src/                    # Express server (port 4000)
│   ├── index.ts                # app + /health and /health/deps
│   ├── loadEnv.ts              # .env resolved relative to the file, not the cwd
│   ├── firebaseAdmin.ts
│   ├── routes/                 # auth.ts, contact.ts, poems.ts
│   └── middleware/requireAuth.ts
└── web/                        # Vite React app (port 3000)
    ├── public/favicon.svg
    └── src/
        ├── App.tsx             # Routes + PoemsProvider
        ├── context/            # PoemsContext, ThemeContext
        ├── i18n/               # en.ts, hu.ts, LanguageProvider
        ├── lib/api.ts          # Typed API client
        ├── components/         # Header, PoemCarousel, ThemeToggle, …
        ├── pages/              # Home, Poems, Admin, Contact
        └── styles/             # global.css, themes.css, admin.css
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
npm run test:e2e   # Playwright layout tests (3 viewports)
```

Vite proxies `/api` to the API in development. Linting/formatting use **[Biome](https://biomejs.dev)** (config in `biome.json`); type-checking is each package's `typecheck` script, orchestrated by Turbo.

---

## Testing

```bash
npm run test:e2e        # all three viewports
npx playwright test --project=desktop
```

Playwright covers **viewports rather than browsers** — desktop, Pixel 8a portrait and
landscape — because the regressions this project actually suffers are layout ones at a
particular size. Each test corresponds to something that has broken before: horizontal
overflow, content rendering past the footer, a reload not landing at the top, poem text
running under the navigation button, a slide orphaned to one or two lines, lines lost when
paging, the TOC indicator failing to draw on a cold load.

The API is stubbed from the shared fixtures and the poem images are stubbed with a 1×1 PNG.
That keeps the suite deterministic and independent of the Render instance, which sleeps on
the free tier — and it is why the assertions can be geometric without being flaky.

---

## API

| Endpoint | Notes |
| --- | --- |
| `GET /health` | Liveness only. Render's health check points here, and it must stay shallow — a probe that fails when Firestore blips would restart a healthy container. |
| `GET /health/deps` | Reads from Firestore and returns 503 if that fails. For uptime monitoring. Cached 30s so a public flood cannot burn the quota. |
| `GET /api/poems` | Falls back to the hardcoded poems if Firestore is unreachable, so the site degrades rather than breaking — which is exactly why `/health/deps` exists. |
| `POST /api/contact` | Validates and length-caps every field, rejects newlines in the ones that reach mail headers, drops honeypot submissions, and rate-limits to 5/hour per IP. Returns 503 if no mail transport is configured rather than discarding the message. |

---

## Deployment

- **Frontend → GitHub Pages** via `.github/workflows/ci.yml` (triggers on push to `main`). The deploy job runs `needs: [verify, e2e]`, so lint, typecheck, build and the layout tests all have to pass before anything publishes — a red build simply does not ship.
- **Node 22 is required** (`.nvmrc`). The compiled API imports raw TypeScript from `packages/shared`, which only loads on a runtime that strips types; on Node 20 it fails pointing at another package with no hint why.
- **API → Render** (free tier). Set `CORS_ORIGIN` (`https://<your-username>.github.io`) on Render, and add the deployed API URL as the `VITE_API_URL` GitHub Actions secret so the Pages build can reach it.
  - Build: `npm install && cd packages/api && npm run build` — Start: `node packages/api/dist/index.js`
  - Infrastructure is described in `render.yaml`; reconcile it against the dashboard before applying it as a Blueprint.

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

# Contact form. Resend (HTTPS) is preferred and is required in production —
# Render's free instances block outbound ports 25/465/587, so SMTP times out there.
RESEND_API_KEY=re_...
RESEND_FROM=onboarding@resend.dev   # optional; needs no domain verification

# SMTP fallback, used only when RESEND_API_KEY is unset. Fine locally.
# Omit both and POST /api/contact returns 503 rather than discarding messages.
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@example.com
SMTP_PASS=your-app-password
CONTACT_TO=pjcr.dekeijzer@gmail.com   # optional; this is the default
```

For Gmail, `SMTP_PASS` has to be an [App Password](https://myaccount.google.com/apppasswords) — a normal account password is rejected — and the account needs 2-Step Verification switched on. The same variables are declared in `render.yaml` for production.

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

Every text colour currently clears the WCAG AA 4.5:1 contrast minimum against its
background, and `--text-tertiary` (`#737373` light, `#828282` dark) sits at the *least*
changed value that still passes — it is the recessive label colour and should stay quiet.
Worth re-checking the ratio before darkening or lightening any of them. Note that contrast
maths on the variables is not the whole story: the poem reader lays a dimming scrim over
the viewport, so anything painted beneath it renders at 68% brightness regardless of what
the colour value says.
