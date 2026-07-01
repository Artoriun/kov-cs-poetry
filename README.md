# Kovács — Modern Poetry Portfolio

A responsive poetry portfolio website built with **React**, **TypeScript**, **Vite**, and custom **CSS**. Designed to showcase poems with elegant typography, immersive image overlays, an auto-advancing carousel, and a full-screen swipeable poem reader — optimized for both desktop and mobile (portrait and landscape).

## Demo
https://artoriun.github.io/kov-cs-poetry/

<img width="1511" height="736" alt="Screenshot 2026-06-20 at 3 40 58" src="https://github.com/user-attachments/assets/a4869d85-daff-4916-b86f-ef086891a52a" />

---

## Features

### General
- Light and dark mode with persistent localStorage preference
- Smooth page transitions and element fade-in animations
- Fully responsive across desktop, tablet, mobile portrait, and mobile landscape
- Auto-reload on device orientation change to ensure correct layout

### Home Page Carousel
- Auto-advances based on poem line count (2.5 seconds per line)
- Pauses on hover; drag-aware (dragging doesn't navigate to detail page)
- Text overlay fades out at the bottom when content is long
- **Read More** button on each slide links to the poem detail page
- Standardised frosted-glass hover effect on all carousel buttons

### Poems Grid
- Paginated responsive grid with animated page transitions
- Table of contents sidebar with scroll tracking
- Highlighted poem card on return from detail view, with animated flowing gradient border effect

### Poem Detail (full-screen reader)
- Vertical swipe carousel — one page of the poem per slide
- Text lines reveal one by one with a staggered fade-in animation
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

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **React** | Component-based UI |
| **TypeScript** | Type safety |
| **Vite** | Build tool & dev server |
| **TurboRepo** | Monorepo build orchestration |
| **React Router** | Client-side routing |
| **React Slick** | Carousel component |
| **CSS Custom Properties** | Theming & responsive design |
| **Google Fonts (Esteban)** | Serif font for poem text |

---

## Project Structure

```
.
├── packages/
│   ├── shared/
│   │   └── src/index.ts          # Poem data (id, title, image, overlay text)
│   └── web/
│       ├── src/
│       │   ├── App.tsx           # Root component, orientation-change reload
│       │   ├── components/
│       │   │   ├── Header.tsx    # Navigation, theme toggle, mobile menu
│       │   │   ├── Footer.tsx
│       │   │   ├── Layout.tsx
│       │   │   ├── PoemCarousel.tsx  # Home page carousel
│       │   │   └── ThemeToggle.tsx
│       │   ├── pages/
│       │   │   ├── Home.tsx      # Home page with carousel
│       │   │   ├── Poems.tsx     # Grid view + full-screen poem detail reader
│       │   │   └── Contact.tsx
│       │   └── styles/
│       │       ├── global.css    # All layout, animation, and responsive styles
│       │       └── themes.css    # Light & dark mode CSS custom properties
│       └── index.html
└── package.json
```

---

## Quick Start

```bash
# Install dependencies
npm install

# Development server
npm run dev -- --host

# Production build
npm run build

# Preview production build
npm run preview
```

---

## Adding Poems

Add entries to `packages/shared/src/index.ts`:

```typescript
export const POEMS = [
  {
    id: "poem-1",
    title: "Title",
    image: "https://cdn-url/image.jpg",
    overlay: "First line\nSecond line\nThird line"
  },
  // ...
];
```

`overlay` is newline-separated text displayed over the image in both the carousel and the detail reader. The first five poems in the array appear in the home page carousel.

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
