# Kovács — Modern Poetry Portfolio

A sophisticated, responsive poetry portfolio website built with **React**, **Vite**, and custom **CSS**. Designed to showcase poems with elegant typography, immersive image overlays, and an auto-advancing carousel — optimized for performance, accessibility, and mobile-first responsiveness.

## 📱 Demo Webpage

Visit the live site: [https://gedichtenv2.vercel.app](https://gedichtenv2.vercel.app)

---

## ✨ Features

- ⚡ **Blazing-fast development** with Vite's instant hot module replacement (HMR)
- 🎨 **Custom CSS theming** with light and dark mode support
- 📱 **Fully responsive** — optimized for desktop, tablet, and mobile (including portrait/landscape modes)
- 🖼️ **Image overlay text** for poems with elegant typography (Esteban font) on carousel and grid
- 🎞️ **Auto-advancing carousel** on home page with smart timing based on poem line count
- 🔄 **Theme toggle** with persistent storage in localStorage
- 📐 **CSS custom properties** for easy color and styling customization
- ✅ **Drag-aware navigation** — carousel slides without navigating to detail pages
- 🚀 **Production-ready builds** with optimized assets and fast load times
- 📱 **Mobile-optimized** carousel buttons and responsive layouts

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v14 or higher
- **npm** or **yarn**

### Installation & Development

```bash
# Clone the repository
git clone https://github.com/your-username/gedichtenv2.git
cd gedichtenv2

# Install dependencies
npm install

# Start the development server (with host enabled for network access)
npm run dev -- --host
```

The app will be available at `http://localhost:5173/` (or the next available port).

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

---

## 📁 Project Structure

```
.
├── packages/
│   ├── shared/               # Shared data & constants
│   │   └── src/
│   │       └── index.ts      # Poem data export
│   └── web/                  # Web application
│       ├── src/
│       │   ├── App.tsx                    # Root application component
│       │   ├── main.tsx                   # Application entry point
│       │   ├── components/
│       │   │   ├── Layout.tsx             # Layout wrapper with Header & Footer
│       │   │   ├── Header.tsx             # Header with navigation & theme toggle
│       │   │   ├── Footer.tsx             # Footer component
│       │   │   ├── PoemCarousel.tsx       # Home page carousel with auto-advance
│       │   │   └── ...                    # Other components
│       │   ├── context/
│       │   │   └── ThemeContext.tsx       # Theme state management & persistence
│       │   ├── pages/
│       │   │   ├── Home.tsx               # Home page with carousel
│       │   │   ├── Poems.tsx              # Poems grid & detail pages
│       │   │   ├── Contact.tsx            # Contact form page
│       │   │   └── ...                    # Other pages
│       │   └── styles/
│       │       ├── global.css             # Global styles, theme variables, responsive design
│       │       └── themes.css             # Light & dark mode CSS custom properties
│       ├── index.html                     # HTML entry point
│       └── package.json                   # Dependencies & scripts
└── package.json              # Monorepo root configuration
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React** | Component-based UI framework |
| **TypeScript** | Type-safe JavaScript |
| **Vite** | Next-generation build tool & dev server |
| **TurboRepo** | Monorepo build system |
| **React Router** | Client-side routing |
| **React Slick** | Carousel component with custom autoplay |
| **CSS Custom Properties** | Dynamic theming & color management |
| **Google Fonts** | Esteban serif font for poem text |

---

## 🎨 Theming

The project uses **CSS custom properties** for easy theming. Two themes are included:

### Light Mode (Default)
- Parchment background image
- Dark text on light background
- Light gray navigation buttons (#999999)
- Light borders

### Dark Mode
- Dark parchment background image
- Light text on dark background
- Light gray navigation buttons (#999999)
- Subtle borders

Users can toggle between themes using the moon/sun icon in the header. Their preference is saved to localStorage with smooth transitions.

**Theme Configuration:** `packages/web/src/styles/themes.css`

---

## 📝 Adding Poems

Poems are stored in the shared data file. Add new poems to `packages/shared/src/index.ts`:

```typescript
export const POEMS = [
  {
    id: "poem-1",
    title: "Poem Title",
    image: "https://path-to-image.jpg",
    overlay: "Poem text or excerpt..." // Optional overlay text displayed on image
  },
  // ... more poems
];
```

---

## 🌐 Features in Detail

### Responsive Design
- **Desktop (>768px):** Full navigation with centered menu, theme toggle on right, large carousel buttons
- **Tablet (481-768px):** Hamburger menu, responsive layout
- **Mobile Portrait (<480px):** Hamburger menu, stacked layout, optimized carousel with smaller buttons and adjusted text padding
- **Mobile Landscape:** Fixed-position carousel buttons centered vertically on screen

### Auto-Advancing Carousel
- Carousel automatically advances based on poem text length
- Smart timing: 1 second per line of text with a 3-second minimum baseline
- Pauses on hover
- Click to navigate to poem detail page (drag-aware — dragging the carousel won't navigate)

### Poem Display
- **Grid view:** All poems displayed in responsive grid with titles above
- **Carousel view:** Featured poems with auto-advance on home page
- **Detail view:** Full poem with image and overlay text
- **Image overlays:** Elegant text with shadow, centered, responsive padding

### Contact Form
- Form validation
- Responsive design
- Theme-aware styling
- Success message on submission

### Drag-Aware Navigation
- Carousel detects drag gestures (>10px movement)
- Dragging slides between poems without navigating to detail page
- Clicking static slides navigates to detail page

---

## 📦 Available Scripts

```bash
# Development
npm run dev           # Start dev server with HMR
npm run dev -- --host # Start dev server accessible on network

# Production
npm run build         # Build for production
npm run preview       # Preview production build locally

# Linting
npm run lint          # Run TypeScript linter
```

---

## 🚀 Deployment

This project is configured for deployment on **Vercel**, **Netlify**, or any static hosting service.

### Deploy on Vercel

```bash
npm install -g vercel
vercel
```

### Deploy on Netlify

Connect your GitHub repository to Netlify and it will automatically build and deploy on push.

---

## 🔧 Customization

### Change Colors
Edit `packages/web/src/styles/themes.css` to modify the CSS custom properties:

```css
:root {
  --bg-primary: url(...), #ffffff;  /* Background image with fallback color */
  --text-primary: #1a1a1a;
  --arrow-color: #999999;           /* Carousel navigation buttons */
  /* ... more variables */
}
```

### Change Typography
Update font imports in `packages/web/src/styles/global.css`

### Modify Layout
Component structure is in `packages/web/src/components/` and page layouts in `packages/web/src/pages/`

### Adjust Carousel Timing
Edit `PoemCarousel.tsx` to change the autoplay delay calculation:
```typescript
const delay = Math.max(3000, lineCount * 1000); // Base 3 seconds + 1 second per line
```

## 📧 Support

For issues, questions, or suggestions, please open an issue in the repository.

