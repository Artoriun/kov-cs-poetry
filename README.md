# Kovács — Modern Poetry Portfolio

Bilingual (Hungarian/English) poetry portfolio: **React**, **TypeScript**, **Vite** and **Motion** in a **TurboRepo** monorepo, with an **Express** + **Firestore** admin portal. Swipeable full-screen poem reader, auto-advancing carousel, working contact form, WCAG AA contrast, and prerendered-then-hydrated pages so the poems are indexable without JavaScript. CI gates every deploy on **Playwright** layout tests and a bundle budget.

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
- Every route is prerendered to static HTML, so the poems are readable without JavaScript and each page carries its own title, description and structured data
- Images are served through Cloudinary at the width the device asks for, and the body font is self-hosted rather than fetched from Google
- Honours `prefers-reduced-motion` — the whole site is built on movement, and the OS setting turns all of it off
- A render error shows a readable page with a way back rather than a blank document, and an unknown address gets a real "not found" page instead of nothing
- `/privacy` describes what the contact form does with a visitor's details: emailed, never stored, no cookies, no analytics

**Admin portal (`/admin`)** — password login + JWT auth (auto-logout on expiry)
- Create, edit, delete, and drag-to-reorder poems; changes persist to Firestore and reflect site-wide instantly
- **List** view (full edit cards) and **Order** view (drag-to-reorder preview grid, mobile touch support)
- Feature poems for the home carousel; upload background images to Cloudinary
- **Custom Slides** — manually split a poem into reader pages, pre-filled from an automatic layout measurement
- Runs in English by default, with an EN/HU switch that affects the portal only

---

## Internationalization

All UI text lives in typed locale files (`packages/web/src/i18n/{en,hu}.ts`) behind a lightweight `LanguageProvider` + `useT()` hook — no i18n dependency. `hu.ts` is type-checked against the `en` shape, so a missing key is a build error. Language comes from the `?lang=` query param, defaulting to **Hungarian** (`VITE_DEFAULT_LANG`); the choice is not persisted, so a refresh always reverts to the default unless `?lang=` is present. Poem content and the *Kovács* / *Admin* labels are left as authored.

The **admin portal defaults to English** while the public site stays Hungarian. A second `LanguageProvider` wraps only the `/admin` route (`defaultLang="en" scoped`), so the two are independent: the EN/HU switch in the portal cannot change the public pages, and leaving `/admin` unmounts that provider rather than leaving a language behind. The scoped provider deliberately does not set `document.lang` — React runs child effects before parent ones, so on a direct load of `/admin` the root provider would overwrite it. Neither provider sets `document.title`: the title is per-route rather than per-language, and `useRouteMeta` owns it, reading the same shared helper the prerenderer uses so the two cannot drift. To add a string, add the key to both locale files and use `t.<key>`.

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
| **Playwright** | Layout regression tests across viewports — and the prerenderer, which drives the built app in a real browser |

---

## Project Structure

```
.nvmrc                          # Node 22 — required, see Deployment
playwright.config.ts            # 3 viewport projects
render.yaml                     # API infrastructure as code
e2e/                            # layout.spec.ts + API-stubbing fixtures
scripts/
├── prerender.mjs               # static HTML per route + sitemap.xml + robots.txt
├── check-budgets.mjs           # bundle budget + untransformed-image guard (CI)
└── hash-password.mjs           # prints an ADMIN_PASSWORD_HASH
packages/
├── shared/src/index.ts         # Poem type, fallback data, per-route SEO metadata
├── api/src/                    # Express server (port 4000)
│   ├── index.ts                # app + /health and /health/deps
│   ├── loadEnv.ts              # .env resolved relative to the file, not the cwd
│   ├── firebaseAdmin.ts
│   ├── password.ts             # scrypt hash + plaintext fallback
│   ├── rateLimit.ts            # per-IP fixed window
│   ├── authState.ts            # login attempts + token epoch (Firestore)
│   ├── routes/                 # auth.ts, contact.ts, poems.ts (+ *.test.ts)
│   └── middleware/requireAuth.ts
└── web/                        # Vite React app (port 3000)
    ├── public/favicon.svg
    └── src/
        ├── main.tsx            # hydrates prerendered pages, else createRoot
        ├── App.tsx             # Routes + PoemsProvider (/admin is lazy-loaded)
        ├── assets/fonts/       # self-hosted Esteban (OFL) + licence
        ├── context/            # PoemsContext, ThemeContext
        ├── i18n/               # en.ts, hu.ts, LanguageProvider
        ├── lib/
        │   ├── api.ts          # Typed API client
        │   ├── images.ts       # Cloudinary transforms + srcset
        │   ├── prerendered.ts  # IS_PRERENDERED / IS_PRERENDERING flags
        │   └── useRouteMeta.ts # per-route <title> and description
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

npm run prerender     # static HTML per route (needs a fresh `npm run build` first)
npm run check:budgets # gzip bundle budget + untransformed-image guard (CI)
npm run hash-password # prints an ADMIN_PASSWORD_HASH for a password you type in
npm run test:api      # API unit + route tests (Node's runner, via tsx)
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

`npm run test:api` covers the server separately, using Node's built-in runner through the
`tsx` that is already a dependency — no test framework was added. It exercises the parts an
attacker reaches first: mail-header injection through the contact form, the honeypot, the
length caps and address validation, the per-IP limit, and the admin password (that the
plaintext form still works, that the same password verifies against its hash, that the hash
does not contain it, and that a stale plaintext cannot reopen access once a hash is set).

The suite was checked by breaking each guard in turn — removing the newline check, disabling
the honeypot, letting a stale plaintext win — and confirming exactly one test failed each
time. Tests are excluded from the API's tsconfig so they never reach `dist`. The auth routes
are not covered yet: they import Firestore, so testing them needs the client mocked.

---

## Rendering & SEO

`scripts/prerender.mjs` runs after the build. It serves `dist`, drives the real app in
Playwright — already a dev dependency, so there is no SSR runtime or second framework —
and writes each route's DOM to its own `index.html`, plus `sitemap.xml` and `robots.txt`.
Poems come from the live API so an admin edit reaches the static HTML, falling back to the
bundled poems if the API is unreachable; the fallback is logged loudly, because visitors
would see the edit either way and only crawlers would be left on stale text.

Without this a crawler received `<div id="root"></div>` and an HTTP 404, since Pages serves
an SPA by falling back to `404.html`. Each route now returns 200 with the poem in the
markup, its own `<title>`, description, canonical and `CreativeWork` JSON-LD. There is
deliberately no `<meta name="keywords">` — no major engine has used it since 2009.

**Prerendered pages are hydrated, not re-rendered.** `createRoot` over existing markup
discards it and rebuilds, and every discarded node takes a Largest Contentful Paint
candidate with it — Lighthouse reported `NO_LCP` on roughly a third of mobile runs. Three
things keep the client's first render matching the markup, and breaking any of them brings
that back:

- Flags like `imageLoaded` and `revealed` initialise from `IS_PRERENDERED`, so the first
  render does not include a loading prompt the captured HTML lacks.
- Poem pagination is skipped while `IS_PRERENDERING`. It measures the viewport, so a poem
  split at 1280×900 could never match the same poem hydrating on a phone. Leaving it
  unpaginated also puts the whole poem in the HTML rather than only the first slide.
- The prerenderer embeds a patch — display order plus any genuinely edited poems — because
  it renders from the API while the client seeds from the bundle.

`npm run check:budgets` runs in CI's `verify` job and so gates the deploy. It caps the
gzipped initial payload and fails on any poem image URL reaching a `src`/`srcSet` without
`optimizeUrl()`; that guard exists because the home carousel shipped 1.2 MB originals for
months purely because the helper was module-local to another file.

---

## API

| Endpoint | Notes |
| --- | --- |
| `GET /health` | Liveness only. Render's health check points here, and it must stay shallow — a probe that fails when Firestore blips would restart a healthy container. |
| `GET /health/deps` | Reads from Firestore and returns 503 if that fails. For uptime monitoring. Cached 30s so a public flood cannot burn the quota. |
| `GET /api/poems` | Falls back to the hardcoded poems if Firestore is unreachable, so the site degrades rather than breaking — which is exactly why `/health/deps` exists. |
| `POST /api/contact` | Validates and length-caps every field, rejects newlines in the ones that reach mail headers, drops honeypot submissions, and rate-limits to 5/hour per IP. Returns 503 if no mail transport is configured rather than discarding the message. |
| `POST /api/auth/login` | Ten attempts per 15 minutes per IP, recorded in Firestore so the window survives the restarts a free instance makes constantly; an in-memory limiter backs it up if Firestore is unreachable. Each failure also costs time (0.5s, 1s, 2s, 4s), which is nothing to someone who mistyped and a lot to a script. The password is compared in constant time, and failures are logged — previously nothing recorded that anyone had tried. |
| `POST /api/auth/revoke-all` | Signs out every session, including a token copied elsewhere. Tokens carry an epoch that `requireAuth` checks, so bumping it invalidates everything issued earlier without rotating `JWT_SECRET` and restarting the API. Requires a valid token. |

---

## Deployment

- **Frontend → GitHub Pages** via `.github/workflows/ci.yml` (triggers on push to `main`). The deploy job runs `needs: [verify, e2e]`, so lint, typecheck, build, the budget guard and the layout tests all have to pass before anything publishes — a red build simply does not ship.
- **Rebuilt weekly** (`schedule:` cron, Mondays 04:00 UTC) and on demand via `workflow_dispatch`. Prerendered HTML is a snapshot, so a poem edited in the admin portal is live for visitors immediately but invisible to crawlers until the next build; the cron bounds that gap without putting a repo-write token in the app. `schedule` is listed in the deploy job's `if:` — omit it and the weekly run builds, tests, then silently skips deploying.
- **Pages-specific workarounds.** Vite builds with `--base=/kov-cs-poetry/` and the router takes a matching `basename`. The prerenderer writes `404.html` from the *untouched* build shell, which Pages serves for `/admin` and any unknown path. It must not be a copy of the prerendered `index.html`: that carries the home page's markup and its `data-prerendered` flag, so the client tries to hydrate a home page into whatever the router actually matched and React discards the markup (`#418`, then `#423`). The generated `robots.txt` is inert here — crawlers read it from the domain root, and this is a project page, so `artoriun.github.io/robots.txt` is what they fetch. On a host serving from a domain root, drop the base path and `robots.txt` starts working.
- **Node 22 is required** (`.nvmrc`). The compiled API imports raw TypeScript from `packages/shared`, which only loads on a runtime that strips types; on Node 20 it fails pointing at another package with no hint why.
- **API → Render** (free tier). Set `CORS_ORIGIN` (`https://<your-username>.github.io`) on Render, and add the deployed API URL as the `VITE_API_URL` GitHub Actions secret so the Pages build can reach it.
  - Build: `npm install && cd packages/api && npm run build` — Start: `node packages/api/dist/index.js`
  - Infrastructure is described in `render.yaml`; reconcile it against the dashboard before applying it as a Blueprint.

---

## Environment Variables

Create `packages/api/.env` for local development:

```env
# One of these two. ADMIN_PASSWORD_HASH is preferred and wins when both are set;
# ADMIN_PASSWORD is the plaintext fallback and still works, so an existing deployment
# needs no change. Generate a hash for the *same* password with `npm run hash-password`,
# set it, confirm you can log in, then delete the plaintext — the password itself does
# not change, only what the dashboard stores. The API warns once at startup while the
# plaintext form is in use.
ADMIN_PASSWORD_HASH=scrypt$...$...
ADMIN_PASSWORD="your-password"

JWT_SECRET=your-jwt-secret
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# Optional. Passed to initializeApp; images go to Cloudinary, so nothing reads it today.
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
CLOUDINARY_URL="cloudinary://api_key:api_secret@cloud_name"
HEALTH_DEPS_TIMEOUT_MS=5000   # optional; how long /health/deps waits on Firestore (default 5000)

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

## Operations

**Changing the admin password.** Run `npm run hash-password`, type the new password, and set
the printed value as `ADMIN_PASSWORD_HASH` on Render. Confirm you can log in, then delete
`ADMIN_PASSWORD` if it is still there. Existing sessions keep working — changing the password
does not sign anyone out, so follow it with a revoke if that is the point.

**If a token leaks** (a shared laptop, a copied `localStorage` value), call `revoke-all` while
logged in. Every issued token stops working immediately, including the one you are using, so
you will be asked to log in again:

```bash
curl -X POST https://<api-host>/api/auth/revoke-all \
  -H "Authorization: Bearer <your-token>"
```

If you cannot log in at all, change `JWT_SECRET` on Render instead — same effect, but it
restarts the API.

**If the site shows no poems**, the API is unreachable. Visitors still see the bundled poems
and the prerendered pages, so nothing goes blank; what is missing is anything edited in the
portal since the last deploy. Check `/health` (liveness) and `/health/deps` (Firestore).

**Publishing an admin edit to search engines.** Edits are live for visitors at once but reach
crawlers only on a rebuild. That happens weekly, or immediately from the Actions tab via
**Run workflow**.

**Known limits, stated plainly.** The API runs on Render's free tier: one instance, no SLA,
and it sleeps when idle unless something pings it. The login rate limit fails open if
Firestore is unreachable — a lockout that fires exactly when the database is down would be
worse than the window it closes. The admin token lives in `localStorage`, so it is readable
by any script that manages to run on the page; moving it to an `httpOnly` cookie needs the
API and site to share an origin.

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
