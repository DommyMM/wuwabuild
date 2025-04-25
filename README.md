# WuWaBuilds

A sophisticated web application for Wuthering Waves players to create, customize, and share character builds through three distinct workflows: manual creation, screenshot OCR scanning, and direct image importing.

Live at: [wuwabuilds.moe](https://wuwabuilds.moe)

## Core Pages & Features

### Home Page (`/`)
- Typewriter text effect showcasing core features
- Build card carousel with 3D rotation effect (2D on mobile)
- Two tutorial sections:
  - Image import tutorial for Discord-posted builds
  - Screenshot scanning guide with example regions
- Mobile-optimized interface with touch/swipe gestures
- Element-themed styling matching game aesthetics

### Build Editor (`/edit`)
The comprehensive character build creation interface:

#### Character & Weapon Selection
- Complete character roster with element variants (special handling for Rover)
- Character level (1-90), sequence (0-6), and basic information controls
- Type-filtered weapon selection with refinement and level controls
- Real-time weapon stat calculation and passive display

#### Echo Panel System
- Five configurable echo panels with drag-and-drop reordering
- Main stat selector with level-based scaling
- Up to 4 substats per panel with CV calculation
- Element set tracking with 2/5-piece bonus calculations
- Phantom echo toggle for specialized builds
- Cost validation system (warns when exceeding 12)
- Echo preset save/load functionality

#### Forte/Talent System
- Interactive skill tree with node activation and level tracking (1-10)
- Branch-specific styling (Normal Attack, Resonance Skill, Forte Circuit, etc.)
- "Max All" and reset buttons for quick configurations
- Real-time stat contribution tracking per node
- Level-based ability scaling with tooltips

#### Stats Dashboard
- Comprehensive stat breakdown from all sources
- Dynamic calculation of derived stats (CV, damage bonuses)
- Element-specific bonuses and resistance calculations
- Quality indicators for substats 

#### Build Creation Tools
- OCR screenshot scanning with region selection guides
- Image upload and URL import options
- Auto-save mechanism with recovery prompt for unsaved work
- Real-time build card preview with element-specific styling
- Customizable username/UID watermark for exported images

#### Build Card Display
- Integrated preview within the editor
- Element-themed visual styling that changes with character element
- Character portrait with weapon and stats display
- Echo panel visualization with set indicators and CV display
- Forte/talent tree visual representation
- Detailed stat breakdown with quality indicators
- Export to image with customization options

The Edit page combines both input systems (manual configuration and OCR scanning) with real-time calculation to generate a visually styled build card that can be exported as an image. The card itself acts as both a live preview and the final output, updating dynamically as the build is modified.

Key technical features include:
- Canvas-based image generation for exports
- Real-time stat calculations with complex game mechanics
- Drag-and-drop echo panel organization
- Element-specific theming that updates with character selection
- Complex state management for all build components

### Saved Builds Page (`/saves`)
The centralized build management dashboard:

- Grid display of saved builds with search and filtering
- Sort options by date, name, CV value, and character
- Build preview cards with element-themed styling
- Quick actions for loading, deleting, and renaming builds
- Data management with backup/restore functionality
- Responsive layout with pagination

The Saves page efficiently manages the user's build library, allowing for organization and quick access to previously created builds.

### Import System (`/import`)
Streamlined system for importing builds from Discord bot images:

- Multiple input methods (file upload, drag-and-drop, clipboard paste)
- Intelligent image processing workflow:
  - Image is segmented into specific regions (character, weapon, echoes, etc.)
  - Parallel OCR processing of all regions for efficiency
  - Special logic for Rover detection (identifies gender and element variant)
  - Direct conversion of OCR results into application data format
- Real-time progress tracking with region-by-region indicators
- Results preview before final import
- One-click options to:
  - Import directly to editor for further customization
  - Save to local build library
  - Submit to global leaderboard (optional)

The Import system eliminates manual build recreation by automatically extracting and mapping all character build data from standardized Discord images directly into the application's data structure.

### Builds/Leaderboard Page (`/builds`)
Global build rankings with comprehensive filtering:
  - Character selection
  - Weapon type filtering
  - Echo set filtering
  - Main stat filtering
  - Region filtering (America, Europe, Asia, SEA, HMT)
  - Username/UID search
- Multiple sorting options (CV, CR, CD, ATK, etc.)
- Expandable entries with detailed stat comparison
- Pagination for navigating large result sets


### Character Leaderboards (`/leaderboards/[characterId]`)
- Character-specific build rankings
- Weapon variant tabs with damage calculations
- Sequence level filtering (S0-S6) where relevant
- Visual damage comparison with graph visualization
- Build sorting by damage output and crit metrics

## Technical Architecture

### Core Technologies
- Next.js with React and TypeScript
- App Router architecture with client/server component separation
- LocalStorage with custom compression for efficient data management
- OCR API integration for screenshot processing

### Key Technical Features
- Custom data compression algorithm with property name mapping
- Version-aware data migration for backward compatibility
- Real-time stat calculations with complex game mechanics
- Canvas-based image generation for build exports
- Drag-and-drop functionality via DND Kit
- Element-specific theming that dynamically updates
- Responsive design for all device sizes

### Performance Optimizations
- Component memoization for expensive stat calculations
- Data caching for frequently accessed game information
- Efficient state management with context providers
- Image optimization for fast loading

### Analytics
- Vercel Analytics and Speed Insights
- ReactGA4 for privacy-focused user behavior tracking

### Environment Variables
```env
NEXT_PUBLIC_API_URL= # OCR API endpoint (defaults to https://ocr.wuwabuilds.moe)
```

## Credits and License
All Wuthering Waves game assets are property of Kuro Games. WuWaBuilds is a fan-made tool and is not affiliated with Kuro Games or Tencent.