# Kovács — Modern Poetry Portfolio

A responsive poetry portfolio website built with **React**, **TypeScript**, **Vite**, **Motion**, and custom **CSS**. Designed to showcase poems with elegant typography, immersive image overlays, an auto-advancing carousel, and a full-screen swipeable poem reader — optimized for both desktop and mobile (portrait and landscape).

## Demo
https://artoriun.github.io/kov-cs-poetry/

<img width="1511" height="729" alt="Screenshot 2026-07-01 at 19 03 43" src="https://github.com/user-attachments/assets/309af18e-225e-4bd6-a0da-be411f6d72d1" />

---

## Features

### General
- Light and dark mode with persistent localStorage preference
- Smooth page transitions and element fade-in animations
- Fully responsive across desktop, tablet, mobile portrait, and mobile landscape
- Auto-reload on device orientation change to ensure correct layout

### Home Page Carousel
- Displays poems marked as **Featured** in the admin portal (falls back to the first five poems if none are featured); poems without overlay text are excluded
- Auto-advances based on poem line count (2.5 seconds per line)
- Pauses on hover; drag/swipe to navigate; drag-aware click suppression so dragging never accidentally opens a poem
- Adjacent slides are preloaded so every swipe transition is seamless regardless of connection speed
- Text overlay and title reveal with a mask-wipe animation **only after the slide image has fully loaded**, sequenced: "FEATURED POEMS" label → poem title → overlay lines
- Text overlay fades out at the bottom when content is long
- **Read More** button on each slide links to the poem detail page
- Frosted-glass prev/next arrow buttons

### Poems Grid
- Paginated responsive grid; page changes animate out the old cards, then stagger in the new ones using **Motion `AnimatePresence mode="wait"`**
- Table of contents sidebar with scroll tracking
- Clicking a TOC entry navigates to the correct page and highlights the card with an animated flowing gradient border, sequenced correctly after the page-change animation completes

### Poem Detail (full-screen reader)
- Vertical swipe carousel powered by **Motion `AnimatePresence mode="wait"`** — one page of the poem per slide
- Native touch handler with `{ passive: false }` prevents Android pull-to-refresh and URL-bar resize during swipe; allows natural page scroll at slide boundaries so the footer is reachable
- Text lines reveal one by one with a staggered mask-wipe animation
- **Per-slide animation memory**: the reveal animation plays only once per visit; navigating back to a seen slide shows text immediately
- Autoplay advances to the next slide after all lines have animated in
- Back button fades in after the last line is revealed on the final slide

#### Landscape mode
- Slides are approximately twice the viewport height, making the full content readable by scrolling
- Swipe navigation only triggers at the top or bottom boundary of the slide; mid-slide touch scrolls the page naturally
- Smooth scroll back to the top of the slide after navigating to a new one
- Header becomes non-sticky so it scrolls away, giving maximum reading space

### Header
- Sticky on desktop; scrolls away in landscape mobile
- Hamburger menu on mobile with smooth open/close animation
- Tapping outside the menu closes it
- **Admin** link navigates to the admin portal

### Admin Portal (`/admin`)
- Password-protected login page with Motion fade-in; error message animates in/out
- **Add** new poems via the + button above the poem list
- **Delete** poems with the × button on each card (soft-deleted in Firestore, hidden site-wide); deletion confirmed via an animated modal
- Edit each poem's title, overlay text, and background image
- Upload replacement images (stored on Cloudinary)
- **Feature** toggle on each card — featured poems appear in the home page carousel; featured cards display a gradient border and a "Featured" label
- Drag-to-reorder poems; order persists and controls display order site-wide (carousel and poems grid)
- Poem cards animate in with a stagger on both login and browser refresh; reordering uses Motion's **`layout` prop** (FLIP) for smooth positional animation
- Full site header (navigation links, hamburger dropdown on mobile, theme toggle) — **Log out** replaces the Admin button when logged in
- New poem cards are drafts until **Save** is pressed — unsaved cards disappear on page refresh

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **React** | Component-based UI |
| **TypeScript** | Type safety |
| **Vite** | Build tool & dev server |
| **TurboRepo** | Monorepo build orchestration |
| **React Router** | Client-side routing |
| **Motion** (`motion/react`) | Declarative animations — `AnimatePresence`, `motion.div`, `layout` prop, variants |
| **Express** | Admin API backend (`packages/api`) |
| **Firebase Firestore** | Poem overrides and display order persistence |
| **Cloudinary** | Image upload and hosting |
| **JWT** | Admin authentication |
| **CSS Custom Properties** | Theming & responsive design |
| **Google Fonts (Esteban)** | Serif font for poem text |

---

## Project Structure

```
.
├── packages/
│   ├── shared/
│   │   └── src/index.ts              # Poem type + hardcoded fallback data
│   ├── api/
│   │   └── src/
│   │       ├── index.ts              # Express server (port 4000)
│   │       ├── firebaseAdmin.ts      # Firestore client
│   │       ├── routes/
│   │       │   ├── auth.ts           # POST /api/auth/login
│   │       │   └── poems.ts          # GET/POST/PUT/DELETE poems, image upload
│   │       └── middleware/
│   │           └── requireAuth.ts    # JWT verification
│   └── web/
│       ├── src/
│       │   ├── App.tsx               # Root component, routes, PoemsProvider
│       │   ├── context/
│       │   │   └── PoemsContext.tsx  # Fetches poems from API, exposes refreshPoems()
│       │   ├── lib/
│       │   │   └── api.ts            # Typed API client functions
│       │   ├── components/
│       │   │   ├── Header.tsx        # Navigation, theme toggle, Log In link
│       │   │   ├── PoemCarousel.tsx  # Home page carousel (featured poems)
│       │   │   └── ThemeToggle.tsx
│       │   ├── pages/
│       │   │   ├── Home.tsx          # Home page with carousel
│       │   │   ├── Poems.tsx         # Grid view + full-screen poem detail reader
│       │   │   ├── Admin.tsx         # Admin portal (login + dashboard)
│       │   │   └── Contact.tsx
│       │   └── styles/
│       │       ├── global.css        # All layout, animation, and responsive styles
│       │       ├── themes.css        # Light & dark mode CSS custom properties
│       │       └── admin.css         # Admin portal styles
│       └── index.html
└── package.json
```

---

## Quick Start

```bash
# Install dependencies
npm install

# Development (starts both web and API)
npm run dev

# Production build
npm run build
```

The web dev server runs on `http://localhost:3000` and the API on `http://localhost:4000`. Vite proxies `/api` requests to the API in development.

---

## Deployment

The static frontend is deployed to **GitHub Pages** via the included Actions workflow (`.github/workflows/deploy.yml`), which triggers on every push to `main`.

The Express API is deployed to **Render** (free tier). Set the following in Render's environment dashboard, then add the deployed API URL as a GitHub Actions secret so the Pages build can reach it:

| Where | Variable | Value |
|-------|----------|-------|
| Render | `CORS_ORIGIN` | `https://<your-github-username>.github.io` |
| GitHub Actions secret | `VITE_API_URL` | `https://<your-render-service>.onrender.com` |

Render build command: `npm install && cd packages/api && npm run build`  
Render start command: `node packages/api/dist/index.js`

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

For the GitHub Pages build, set `VITE_API_URL` as a repository secret pointing to your deployed API. Without it, the frontend falls back to relative `/api` paths (suitable for local dev behind the Vite proxy).

---

## Managing Poems

Poem content lives in `packages/shared/src/index.ts` as the hardcoded fallback. Edits made in the admin portal (title, overlay text, background image, order, featured status, deletion) are stored in Firestore and take precedence over the hardcoded data at runtime.

New poems can be created directly from the admin portal using the **+ Add Poem** button — no code changes required. These are stored entirely in Firestore with a generated ID.

To add a hardcoded poem (as a fallback), add an entry to `POEMS` in `packages/shared/src/index.ts`:

```typescript
{
  id: "poem-6",
  title: "Title",
  image: "https://res.cloudinary.com/your-cloud/image/upload/v.../image.jpg",
  overlay: "First line\nSecond line\nThird line"
}
```

`overlay` is newline-separated text displayed over the image in the carousel and detail reader.

---

## Theming

Edit `packages/web/src/styles/themes.css` to change colours. The key variables:

```css
:root {
  --bg-primary: url(...), #fafafa;
  --text-primary: #2c2c2c;
  --header-bg: #ffffff;
  --dropdown-bg: #f8f8f8;
  /* ... */
}
```

Dark mode overrides are in `html.dark-mode { ... }` in the same file.
