# Kovács — Modern Poetry Portfolio

A sophisticated, responsive poetry portfolio website built with **React**, **Vite**, and custom **CSS**. Designed to showcase poems with elegant typography and immersive image overlays — optimized for performance, accessibility, and mobile-first responsiveness.

## 📱 Demo Webpage

Visit the live site: [https://gedichtenv2.vercel.app](https://gedichtenv2.vercel.app)

---

## ✨ Features

- ⚡ **Blazing-fast development** with Vite's instant hot module replacement (HMR)
- 🎨 **Custom CSS theming** with light and dark mode support
- 📱 **Fully responsive** — looks great on desktop, tablet, and mobile
- 🖼️ **Image overlay text** for poems with elegant typography (Esteban font)
- 🎞️ **Interactive carousel** on the home page with smooth navigation
- 🔄 **Theme toggle** with persistent storage in localStorage
- 📐 **CSS custom properties** for easy color and styling customization
- 🚀 **Production-ready builds** with optimized assets and fast load times

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
│       │   │   ├── Header.tsx             # Header with navigation & theme toggle
│       │   │   ├── ThemeToggle.tsx        # Theme switcher button
│       │   │   ├── ProjectCarousel.tsx    # Home page carousel
│       │   │   └── ...                    # Other components
│       │   ├── context/
│       │   │   └── ThemeContext.tsx       # Theme state management
│       │   ├── pages/
│       │   │   ├── Home.tsx               # Home page
│       │   │   ├── Poems.tsx              # Poems grid & detail pages
│       │   │   ├── Contact.tsx            # Contact form page
│       │   │   └── ...                    # Other pages
│       │   └── styles/
│       │       ├── global.css             # Global styles & theme variables
│       │       └── themes.css             # Light & dark mode definitions
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
| **React Slick** | Carousel component |
| **CSS Custom Properties** | Dynamic theming & color management |
| **Google Fonts** | Esteban serif font for poem text |

---

## 🎨 Theming

The project uses **CSS custom properties** for easy theming. Two themes are included:

### Light Mode (Default)
- White backgrounds
- Dark text
- Light borders

### Dark Mode
- Dark backgrounds
- Light text
- Subtle borders

Users can toggle between themes using the moon/sun icon in the header. Their preference is saved to localStorage.

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
    overlay: "Poem text or excerpt..." // Optional overlay text
  },
  // ... more poems
];
```

---

## 🌐 Features in Detail

### Responsive Design
- **Desktop:** Full navigation with centered menu, theme toggle on the right
- **Mobile Portrait:** Hamburger menu, stacked layout
- **Mobile Landscape:** Optimized carousel with visible navigation buttons

### Dark Mode
- Automatic theme persistence
- Smooth transitions between themes
- All components support both themes

### Poem Overlays
- Text overlaid on images with proper centering
- Elegant Esteban serif typography
- Text shadow for readability
- Responsive padding and font sizes

### Contact Form
- Form validation
- Responsive design
- Theme-aware styling

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
  --bg-primary: #ffffff;
  --text-primary: #1a1a1a;
  /* ... more variables */
}
```

### Change Typography
Update font imports in `packages/web/src/styles/global.css`

### Modify Layout
Component structure is in `packages/web/src/components/` and page layouts in `packages/web/src/pages/`

---

## 📄 License

This project is open source and available under the MIT License.

---

## 👤 Author

Created as a modern poetry portfolio website showcasing elegance and performance.

---

## 🤝 Contributing

Contributions are welcome! Feel free to fork this repository and submit pull requests for any improvements.

---

## 📧 Support

For issues, questions, or suggestions, please open an issue in the repository.
