# WuWaBuilds Frontend Migration Plan

## Overview

This document outlines the migration strategy for rewriting the WuWaBuilds frontend from the existing MUI/CSS implementation to a modern Tailwind CSS-based architecture.

**Source**: `frontend/` (Next.js 15 + MUI + CSS)
**Target**: `wuwabuilds/` (Next.js 16 + Tailwind CSS 4)

---

## Phase 1: Foundation Setup (Current)

### 1.1 Dark Theme Base

The existing app uses a dark theme with these core colors:

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#121212` | Main background |
| `--background-secondary` | `#1E1E1E` | Navbar, cards, panels |
| `--text-primary` | `#E0E0E0` | Primary text |
| `--accent` | `#a69662` | Gold accent (buttons, active states) |
| `--accent-hover` | `#bfad7d` | Lighter gold for hover |
| `--border` | `#333` | Border color |

**Element Colors (CSS Variables):**
- `--spectro`: `#f7eb95` (yellow)
- `--havoc`: `#f2b6de` (pink)
- `--aero`: `#b0ffb0` (green)
- `--fusion`: `#ff4500` to `#ffd700` (orange gradient)
- `--glacio`: `#00ced1` to `#ffffff` (cyan gradient)
- `--electro`: `#8a2be2` to `#6a5acd` (purple gradient)

### 1.2 Typography

**Font Stack:**
- `Ropa` - Primary body font (from `/fonts/Ropa.OTF`)
- `Gowun` - Accent/UI font (from `/fonts/GowunDodum-Regular.ttf`)
- `YRDZST-Semibold` - Special characters (from `/fonts/YRDZST-Semibold.ttf`)

### 1.3 Tailwind Config Extensions

```js
// tailwind.config.ts additions needed:
{
  theme: {
    extend: {
      colors: {
        background: '#121212',
        'background-secondary': '#1E1E1E',
        'text-primary': '#E0E0E0',
        accent: '#a69662',
        'accent-hover': '#bfad7d',
        border: '#333',
        spectro: '#f7eb95',
        havoc: '#f2b6de',
        aero: '#b0ffb0',
      },
      fontFamily: {
        ropa: ['Ropa', 'sans-serif'],
        gowun: ['Gowun', 'sans-serif'],
      },
    },
  },
}
```

---

## Phase 2: Navigation Component

### Existing Implementation (`frontend/src/components/Navigation.tsx`)

**Structure:**
- Sticky navbar at top (`position: sticky; top: 0; z-index: 999`)
- Logo/title "WuWaBuilds" linking to `/`
- Navigation links: Import, Builds, Rank, Edit, Saves
- Active state detection via `usePathname()`

**Styling Breakdown:**

| Element | Desktop | Mobile (< 1200px) |
|---------|---------|-------------------|
| Container | `flex-row`, left-aligned | `flex-col`, centered |
| Title | 36px, bold, Gowun font | Same |
| Links | 24px, horizontal row | Stacked, smaller padding |
| Active Link | Gold color, bottom border, subtle bg | Same |
| Hover | Slight lift, gold tint, shadow | Same |

**Tailwind Translation:**

```tsx
// Navbar container
<nav className="sticky top-0 z-50 bg-background-secondary border-b border-border">

// Nav content wrapper
<div className="flex items-center gap-5 px-10 py-1 max-lg:flex-col max-lg:px-0 max-lg:gap-0">

// Title
<Link className="text-4xl font-bold font-gowun text-text-primary hover:text-accent transition-colors">

// Links container
<div className="flex gap-1">

// Individual link
<Link className="text-2xl font-medium px-4 py-2 rounded text-text-primary
                 hover:text-accent-hover hover:bg-accent/10 hover:-translate-y-0.5
                 transition-all">

// Active link (additional classes)
"text-accent bg-accent/15 font-semibold border-b-2 border-accent"
```

---

## Phase 3: Homepage Components

### 3.1 HomePage Structure

The homepage consists of:

1. **Hero Section** - Typewriter animation with rotating features
2. **Carousel** - 3D rotating build card showcase (5 cards)
3. **Tutorial Toggle** - Switch between Import/Scan tutorials
4. **Tutorial Content** - Step-by-step guides with images
5. **Disclaimer** - Footer text

### 3.2 Key Animations

**Typewriter Effect:**
- Character-by-character text animation
- 50ms type speed, 30ms delete speed
- 2s pause between features
- Blinking cursor (`|`)

**Carousel:**
- Desktop: 3D perspective transforms (rotateY, translateZ, blur)
- Mobile: Simple horizontal slide with opacity
- Auto-rotation every 4s (pauses on hover)

### 3.3 Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| Desktop (> 1200px) | Full 3D carousel, side-by-side tutorials |
| Tablet (768-1200px) | 2D carousel, stacked tutorials |
| Mobile (< 768px) | Swipe carousel, touch gestures, compact layout |

---

## Phase 4: File Structure

### Source Structure (frontend)
```
frontend/src/
├── app/
│   ├── page.tsx              # Home route (metadata + HomePage)
│   ├── layout.tsx            # Root layout with providers
│   └── globals.css           # Global styles + nav styles
├── components/
│   ├── Navigation.tsx        # Navbar component
│   └── Home/
│       ├── HomePage.tsx      # Main home component
│       ├── Home.css          # Homepage styles
│       ├── ScanTutorial.tsx  # Scan guide component
│       ├── ImportTutorial.tsx # Import guide component
│       └── ImportTutorial.css
└── providers.tsx             # Context providers
```

### Target Structure (wuwabuilds)
```
wuwabuilds/
├── app/
│   ├── page.tsx              # Home route
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Tailwind + custom CSS
├── components/
│   ├── Navigation.tsx        # Navbar (Tailwind)
│   └── home/
│       ├── HomePage.tsx      # Main home (Tailwind)
│       ├── Typewriter.tsx    # Extracted animation
│       ├── Carousel.tsx      # Card carousel
│       ├── ScanTutorial.tsx  # Scan guide
│       └── ImportTutorial.tsx # Import guide
└── public/                   # Copied from frontend
```

---

## Phase 5: Dependencies

### Keep
- `next` (16.1.0)
- `react` / `react-dom` (19.2.3)
- `tailwindcss` (4.x)
- `lucide-react` (for icons)

### Add Later (as needed)
- `react-toastify` (notifications)
- `@dnd-kit/*` (drag-and-drop for echo panels)
- `recharts` (damage graphs)
- `fuse.js` (fuzzy search)
- `tesseract.js` (OCR)

### Remove (MUI)
- `@mui/material`
- `@mui/icons-material`
- `@emotion/react`
- `@emotion/styled`

---

## Migration Checklist

### Phase 1: Foundation
- [x] Initialize Next.js 16 + Tailwind project
- [ ] Copy public folder assets
- [ ] Configure Tailwind with custom colors
- [ ] Set up custom fonts
- [ ] Create dark theme base layout

### Phase 2: Navigation
- [ ] Create Navigation component
- [ ] Implement active state detection
- [ ] Add responsive mobile layout
- [ ] Test all nav links

### Phase 3: Homepage
- [ ] Create HomePage shell
- [ ] Implement Typewriter animation
- [ ] Build Carousel component
- [ ] Create tutorial toggle
- [ ] Add ScanTutorial component
- [ ] Add ImportTutorial component
- [ ] Implement mobile swipe gestures

### Phase 4: Polish
- [ ] Add metadata/SEO
- [ ] Test responsive breakpoints
- [ ] Optimize images
- [ ] Performance audit

---

## Notes

### Styling Philosophy
- Use Tailwind utility classes as primary styling method
- Extract repeated patterns into `@apply` directives sparingly
- Keep component files focused (no large CSS files)
- Use CSS variables for element-specific colors (dynamic theming)

### Best Practices
- Prefer `className` string composition over CSS modules
- Use `clsx` or `cn` utility for conditional classes
- Keep animations in CSS (better performance than JS)
- Lazy load heavy components (carousel images)

### Assets to Copy
From `frontend/public/`:
- `/fonts/` - All custom fonts
- `/images/card0-4.png` - Carousel images
- `/images/scan-*.webp` - Tutorial screenshots
- `/images/import-*.webp` - Import tutorial images
- `/Data/` - Game data JSON files
- `/favicon.ico` - Site icon
- `/logo*.png` - Logo assets
